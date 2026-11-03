package in.arogyamitra.platform.service.auth;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import in.arogyamitra.platform.entity.users.AppUser;
import in.arogyamitra.platform.entity.users.UserSession;
import in.arogyamitra.platform.exception.ResourceNotFoundException;
import in.arogyamitra.platform.repository.users.AppUserRepository;
import in.arogyamitra.platform.repository.users.UserSessionRepository;
import in.arogyamitra.platform.security.CurrentUser;
import in.arogyamitra.platform.security.JwtService;
import in.arogyamitra.platform.security.TokenHashing;
import in.arogyamitra.platform.spi.AuditEvent;

/**
 * Device sessions: a 15-minute access token (JWT with the session id) plus a 7-day refresh token that is
 * replaced on every use. Presenting an already-replaced refresh token after the short grace period means it was
 * copied, so every session of that user is revoked.
 */
@Service
public class SessionService {

    /** What the client gets after login or refresh. refreshToken is null when the current one stays valid. */
    public record IssuedTokens(String accessToken, long accessExpiresInMs, String refreshToken,
            LocalDateTime sessionExpiresAt, String sessionId, AppUser user) {
    }

    public static final String REASON_LOGOUT = "LOGOUT";
    public static final String REASON_REVOKED = "REVOKED_BY_USER";
    public static final String REASON_ADMIN = "REVOKED_BY_ADMIN";
    public static final String REASON_PASSWORD_CHANGED = "PASSWORD_CHANGED";
    public static final String REASON_PASSWORD_RESET = "PASSWORD_RESET";
    public static final String REASON_DEACTIVATED = "USER_DEACTIVATED";
    public static final String REASON_REUSE = "REFRESH_TOKEN_REUSE";

    private static final Logger log = LoggerFactory.getLogger(SessionService.class);
    private static final String EXPIRED = "Your session has expired. Please log in again.";

    private final UserSessionRepository sessions;
    private final AppUserRepository users;
    private final JwtService jwt;
    private final ApplicationEventPublisher events;
    private final Duration idleTimeout;
    private final Duration absoluteTimeout;
    private final Duration reuseGrace;

    public SessionService(UserSessionRepository sessions, AppUserRepository users, JwtService jwt,
            ApplicationEventPublisher events,
            @Value("${app.security.session.idle-timeout:7d}") Duration idleTimeout,
            @Value("${app.security.session.absolute-timeout:30d}") Duration absoluteTimeout,
            @Value("${app.security.session.reuse-grace:30s}") Duration reuseGrace) {
        this.sessions = sessions;
        this.users = users;
        this.jwt = jwt;
        this.events = events;
        this.idleTimeout = idleTimeout;
        this.absoluteTimeout = absoluteTimeout;
        this.reuseGrace = reuseGrace;
    }

    /** A new session for a user who has just proven their password. */
    @Transactional
    public IssuedTokens open(AppUser user, String ip, String userAgent) {
        LocalDateTime now = LocalDateTime.now();
        String refresh = TokenHashing.newToken();
        LocalDateTime absolute = now.plus(absoluteTimeout);
        LocalDateTime idle = now.plus(idleTimeout);
        UserSession session = sessions.save(new UserSession(user.getId(), TokenHashing.sha256(refresh), ip, userAgent,
                now, idle.isAfter(absolute) ? absolute : idle, absolute));
        return issue(user, session, refresh);
    }

    /** Swaps a refresh token for a new access token and a new refresh token. */
    @Transactional(noRollbackFor = BadCredentialsException.class)
    public IssuedTokens refresh(String rawRefreshToken, String ip, String userAgent) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new BadCredentialsException(EXPIRED);
        }
        LocalDateTime now = LocalDateTime.now();
        String hash = TokenHashing.sha256(rawRefreshToken);
        UserSession session = sessions.findByRefreshTokenHash(hash).orElse(null);
        if (session == null) {
            return refreshWithReplacedToken(hash, now);
        }
        if (!session.isActive(now)) {
            throw new BadCredentialsException(EXPIRED);
        }
        AppUser user = users.findById(session.getUserId()).filter(AppUser::isEnabled).orElse(null);
        if (user == null) {
            session.revoke(now, REASON_DEACTIVATED);
            throw new BadCredentialsException(EXPIRED);
        }
        String refresh = TokenHashing.newToken();
        session.rotate(TokenHashing.sha256(refresh), now, now.plus(idleTimeout), ip, userAgent);
        return issue(user, session, refresh);
    }

    /**
     * The token is not the current one of any session. If it is the one just replaced, a parallel request (another
     * tab) raced this one: hand out an access token and leave the refresh cookie alone. Later than that, it is a
     * copy being replayed: end every session of the user.
     */
    private IssuedTokens refreshWithReplacedToken(String hash, LocalDateTime now) {
        UserSession previous = sessions.findFirstByPreviousTokenHash(hash).orElse(null);
        if (previous == null || !previous.isActive(now)) {
            throw new BadCredentialsException(EXPIRED);
        }
        if (previous.getRotatedAt() != null && previous.getRotatedAt().plus(reuseGrace).isAfter(now)) {
            AppUser user = users.findById(previous.getUserId()).filter(AppUser::isEnabled)
                    .orElseThrow(() -> new BadCredentialsException(EXPIRED));
            return issue(user, previous, null);
        }
        int revoked = sessions.revokeAll(previous.getUserId(), now, REASON_REUSE);
        log.warn("[SECURITY] Refresh token reuse for user {} (session {}): {} session(s) revoked",
                previous.getUserId(), previous.getId(), revoked);
        events.publishEvent(AuditEvent.of("User", previous.getUserId(), "SESSIONS_REVOKED",
                Map.of("reason", REASON_REUSE, "count", revoked)));
        throw new BadCredentialsException(EXPIRED);
    }

    private IssuedTokens issue(AppUser user, UserSession session, String rawRefresh) {
        return new IssuedTokens(jwt.generateToken(user, session.getId()), jwt.getExpirationMs(), rawRefresh,
                session.getExpiresAt(), session.getId(), user);
    }

    /** Per request: the current user for a parsed access token, or empty when its session or user is no longer active. */
    @Transactional(readOnly = true)
    public Optional<CurrentUser> authenticate(CurrentUser fromToken) {
        if (fromToken == null || fromToken.getSessionId() == null) {
            return Optional.empty();
        }
        return sessions.findActiveUser(fromToken.getSessionId(), fromToken.getId(), LocalDateTime.now())
                .map(u -> new CurrentUser(u.getId(), u.getEmail(), u.getUsername(), u.getRole(),
                        fromToken.getSessionId()));
    }

    /** Logout with the refresh token (works even when the access token has already expired). */
    @Transactional
    public void revokeByRefreshToken(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        sessions.findByRefreshTokenHash(TokenHashing.sha256(rawRefreshToken))
                .ifPresent(s -> s.revoke(LocalDateTime.now(), REASON_LOGOUT));
    }

    @Transactional
    public void revoke(String sessionId, String reason) {
        if (sessionId != null) {
            sessions.findById(sessionId).ifPresent(s -> s.revoke(LocalDateTime.now(), reason));
        }
    }

    /** One of the user's own sessions (the "log out that device" button). */
    @Transactional
    public void revokeOwn(Long userId, String sessionId) {
        UserSession session = sessions.findById(sessionId).filter(s -> s.getUserId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Session not found."));
        session.revoke(LocalDateTime.now(), REASON_REVOKED);
        events.publishEvent(AuditEvent.of("User", userId, "SESSION_REVOKED", Map.of("reason", REASON_REVOKED)));
    }

    /** Every session of the user except keepSessionId (null = all of them). Returns how many were ended. */
    @Transactional
    public int revokeAll(Long userId, String keepSessionId, String reason) {
        LocalDateTime now = LocalDateTime.now();
        int count = keepSessionId == null
                ? sessions.revokeAll(userId, now, reason)
                : sessions.revokeAllExcept(userId, keepSessionId, now, reason);
        if (count > 0) {
            events.publishEvent(AuditEvent.of("User", userId, "SESSIONS_REVOKED",
                    Map.of("reason", reason, "count", count)));
        }
        return count;
    }

    @Transactional(readOnly = true)
    public List<UserSession> listActive(Long userId) {
        return sessions.findActiveByUser(userId, LocalDateTime.now());
    }

    /** Ended sessions are kept for 30 days (for "where was I logged in"), then deleted. Daily at 03:30. */
    @Scheduled(cron = "${app.security.session.cleanup-cron:0 30 3 * * *}")
    @Transactional
    public void purgeEnded() {
        int deleted = sessions.deleteEndedBefore(LocalDateTime.now().minusDays(30));
        if (deleted > 0) {
            log.info("Deleted {} ended user sessions", deleted);
        }
    }
}
