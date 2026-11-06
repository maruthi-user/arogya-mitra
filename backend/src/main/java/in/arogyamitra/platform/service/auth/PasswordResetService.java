package in.arogyamitra.platform.service.auth;

import in.arogyamitra.platform.config.AppConfig;
import in.arogyamitra.platform.config.ConditionalOnAppModule;
import in.arogyamitra.platform.entity.users.AppUser;
import in.arogyamitra.platform.entity.users.PasswordResetToken;
import in.arogyamitra.platform.exception.BadRequestException;
import in.arogyamitra.platform.repository.users.PasswordResetTokenRepository;
import in.arogyamitra.platform.security.TokenHashing;
import in.arogyamitra.platform.service.users.UserService;
import in.arogyamitra.platform.spi.AuditEvent;
import in.arogyamitra.platform.spi.NotificationEvent;
import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Forgot / reset password. The request step always looks successful, whether or not the address
 * belongs to an account, so it cannot be used to discover who has one. Tokens are single use,
 * expire, and only their hash is stored. Resetting also clears a lockout, since the person has just
 * proven they own the mailbox, and ends every signed-in session of the account
 * (UserService.resetPassword).
 */
@Service
@ConditionalOnAppModule("passwordreset")
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final String INVALID = "This reset link is invalid or has expired.";

    private final PasswordResetTokenRepository tokens;
    private final UserService users;
    private final AppConfig config;
    private final ApplicationEventPublisher events;
    private final String frontendUrl;
    private final String resetPath;
    private final long ttlMinutes;
    private final int maxPerHour;

    public PasswordResetService(
            PasswordResetTokenRepository tokens,
            UserService users,
            AppConfig config,
            ApplicationEventPublisher events,
            @Value("${frontend.url:}") String frontendUrl,
            @Value("${app.password-reset.path:/auth/restore-password?token=}") String resetPath,
            @Value("${app.password-reset.token-ttl-minutes:60}") long ttlMinutes,
            @Value("${app.password-reset.max-requests-per-hour:3}") int maxPerHour) {
        this.tokens = tokens;
        this.users = users;
        this.config = config;
        this.events = events;
        this.frontendUrl = frontendUrl;
        this.resetPath = resetPath;
        this.ttlMinutes = ttlMinutes;
        this.maxPerHour = maxPerHour;
    }

    /** The link can only reach people by email, so the email module must be on. */
    @PostConstruct
    void requireEmailModule() {
        if (!config.isModuleEnabled("email")) {
            throw new IllegalStateException(
                    "The passwordreset module sends its link by email: enable the email module as well.");
        }
    }

    @Transactional
    public void requestReset(String email) {
        AppUser user = users.findActiveByEmail(email).orElse(null);
        if (user == null) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        if (tokens.countByUserIdAndCreatedAtAfter(user.getId(), now.minusHours(1)) >= maxPerHour) {
            log.warn(
                    "Password reset for user {} skipped: too many requests in the last hour",
                    user.getId());
            return;
        }
        tokens.invalidateOpenTokens(user.getId(), now);

        String raw = TokenHashing.newToken();
        tokens.save(new PasswordResetToken(user.getId(), hash(raw), now.plusMinutes(ttlMinutes)));

        String product = config.app().name();
        events.publishEvent(
                NotificationEvent.toAddress(
                        user.getEmail(),
                        "PASSWORD-RESET",
                        "Password reset request for your " + product + " account",
                        "password-reset",
                        Map.of(
                                "userName",
                                user.getUsername(),
                                "passwordResetLink",
                                frontendUrl + resetPath + raw,
                                "expiryMinutes",
                                ttlMinutes)));
        events.publishEvent(AuditEvent.of("User", user.getId(), "PASSWORD_RESET_REQUESTED"));
    }

    @Transactional
    public void reset(String rawToken, String newPassword) {
        LocalDateTime now = LocalDateTime.now();
        PasswordResetToken token =
                tokens.findByTokenHash(hash(rawToken == null ? "" : rawToken))
                        .filter(t -> t.isUsable(now))
                        .orElseThrow(() -> new BadRequestException(INVALID));
        AppUser user =
                users.findActiveById(token.getUserId())
                        .orElseThrow(() -> new BadRequestException(INVALID));

        users.resetPassword(user.getId(), newPassword); // checks the password policy first
        token.markUsed(now);
        tokens.invalidateOpenTokens(user.getId(), now);
    }

    static String hash(String token) {
        return TokenHashing.sha256(token);
    }
}
