package in.arogyamitra.platform.service.auth;

import in.arogyamitra.platform.entity.users.AppUser;
import in.arogyamitra.platform.repository.users.AppUserRepository;
import in.arogyamitra.platform.security.PermissionService;
import in.arogyamitra.platform.security.RateLimiter;
import in.arogyamitra.platform.service.auth.SessionService.IssuedTokens;
import in.arogyamitra.platform.service.users.UserService;
import in.arogyamitra.platform.spi.AuditEvent;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    public record LoginResult(IssuedTokens tokens, List<String> permissions) {}

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String INVALID = "Invalid username or password.";

    private final AppUserRepository users;
    private final UserService userService;
    private final PasswordEncoder encoder;
    private final SessionService sessions;
    private final PermissionService permissions;
    private final RateLimiter rateLimiter;
    private final ApplicationEventPublisher events;
    private final int maxFailedAttempts;
    private final int maxAttempts;
    private final int maxAttemptsPerIp;
    private final Duration window;
    private final String dummyHash;

    public AuthService(
            AppUserRepository users,
            UserService userService,
            PasswordEncoder encoder,
            SessionService sessions,
            PermissionService permissions,
            RateLimiter rateLimiter,
            ApplicationEventPublisher events,
            @Value("${app.security.max-failed-attempts:5}") int maxFailedAttempts,
            @Value("${app.rate-limit.login.max-attempts:5}") int maxAttempts,
            @Value("${app.rate-limit.login.max-attempts-per-ip:20}") int maxAttemptsPerIp,
            @Value("${app.rate-limit.login.window:15m}") Duration window) {
        this.users = users;
        this.userService = userService;
        this.encoder = encoder;
        this.sessions = sessions;
        this.permissions = permissions;
        this.rateLimiter = rateLimiter;
        this.events = events;
        this.maxFailedAttempts = maxFailedAttempts;
        this.maxAttempts = maxAttempts;
        this.maxAttemptsPerIp = maxAttemptsPerIp;
        this.window = window;
        this.dummyHash = encoder.encode("not-a-real-password");
    }

    /**
     * Checks the password and opens a new device session. Rate limited per IP + login name and per
     * IP, before any password is checked. The failed-attempt counter must survive the exception,
     * hence noRollbackFor.
     */
    @Transactional(noRollbackFor = org.springframework.security.core.AuthenticationException.class)
    public LoginResult login(String login, String password, String ip, String userAgent) {
        String loginKey =
                "login:" + ip + ":" + (login == null ? "" : login.trim().toLowerCase(Locale.ROOT));
        rateLimiter.consume("login-ip:" + ip, maxAttemptsPerIp, window);
        rateLimiter.consume(loginKey, maxAttempts, window);

        AppUser user = userService.findByLogin(login).orElse(null);
        if (user == null) {
            encoder.matches(
                    password,
                    dummyHash); // same work as a real check, so timing does not reveal unknown
            // emails
            log.warn("[SECURITY] Login failed for unknown login from {}", ip);
            throw new BadCredentialsException(INVALID);
        }
        if (user.getFailedAttempts() >= maxFailedAttempts) {
            throw new LockedException(
                    "Account is locked after too many failed attempts. Ask an administrator to unlock it.");
        }
        if (!encoder.matches(password, user.getPassword())) {
            user.setFailedAttempts(user.getFailedAttempts() + 1);
            users.save(user);
            log.warn(
                    "[SECURITY] Login failed for user {} from {} ({} failed)",
                    user.getId(),
                    ip,
                    user.getFailedAttempts());
            events.publishEvent(
                    AuditEvent.of(
                            "User",
                            user.getId(),
                            "LOGIN_FAILED",
                            Map.of("ip", String.valueOf(ip))));
            throw new BadCredentialsException(INVALID);
        }
        if (!user.isEnabled()) {
            throw new DisabledException("Account is inactive.");
        }
        rateLimiter.reset(loginKey);
        user.setFailedAttempts(0);
        user.setLastLoginAt(LocalDateTime.now());
        users.save(user);
        IssuedTokens tokens = sessions.open(user, ip, userAgent);
        events.publishEvent(
                AuditEvent.of("User", user.getId(), "LOGIN", Map.of("ip", String.valueOf(ip))));
        return new LoginResult(tokens, permissions.permissionsOf(user.getRole()));
    }
}
