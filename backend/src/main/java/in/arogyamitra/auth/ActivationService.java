package in.arogyamitra.auth;

import static in.arogyamitra.shared.ApiInput.*;

import in.arogyamitra.notification.NotificationService;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivationService {
    private final PlatformAccountBridge bridge;
    private final JdbcTemplate db;
    private final NotificationService notifications;
    private final PasswordEncoder passwords;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.frontend-url:http://localhost:3002}")
    String frontend;

    public ActivationService(
            JdbcTemplate db,
            NotificationService notifications,
            PasswordEncoder passwords,
            PlatformAccountBridge bridge) {
        this.bridge = bridge;
        this.db = db;
        this.notifications = notifications;
        this.passwords = passwords;
    }

    private String hash(String token) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public void issue(String accountId, String email, String instructions) {
        db.update("UPDATE activation_tokens SET used=TRUE WHERE account_id=?", accountId);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        db.update(
                "INSERT INTO activation_tokens(token_hash,account_id,expires_at,used) VALUES(?,?,?,FALSE)",
                hash(token),
                accountId,
                System.currentTimeMillis() + 86400000);
        String role =
                db
                        .query(
                                "SELECT role FROM accounts WHERE id=?",
                                (r, n) -> r.getString(1),
                                accountId)
                        .stream()
                        .findFirst()
                        .orElse("provider");
        notifications.queue(
                email,
                "Arogya Mitra — account access",
                instructions
                        + "\n\nSet your password (valid for 24 hours, one use):\n"
                        + frontend
                        + "/#activate="
                        + token
                        + "\n\nLogin: "
                        + frontend
                        + "/#"
                        + role
                        + "-login\nIf you did not request this, ignore this email.");
    }

    @Transactional
    public void request(String email) {
        var accounts =
                db.queryForList(
                        "SELECT id,email FROM accounts WHERE email=? AND role IN ('provider','verifier') AND suspended=FALSE AND registration_status='approved' AND must_change_password=FALSE",
                        email.toLowerCase(Locale.ROOT));
        if (!accounts.isEmpty())
            issue(
                    (String) accounts.get(0).get("id"),
                    (String) accounts.get(0).get("email"),
                    "Use this link to set or reset your Arogya Mitra password.");
    }

    @Transactional
    public void activate(String token, String password) {
        // Same rule as every other password form (8+ characters with a letter and a digit).
        try {
            in.arogyamitra.platform.service.users.PasswordPolicy.check(password);
        } catch (in.arogyamitra.platform.exception.BadRequestException e) {
            throw invalid(e.getMessage());
        }
        if (token.length() > 200) throw invalid("Invalid activation link");
        var rows =
                db.queryForList(
                        "SELECT account_id,expires_at,used FROM activation_tokens WHERE token_hash=? FOR UPDATE",
                        hash(token));
        if (rows.isEmpty()
                || Boolean.TRUE.equals(rows.get(0).get("used"))
                || ((Number) rows.get(0).get("expires_at")).longValue()
                        <= System.currentTimeMillis())
            throw invalid("This link is invalid or expired. Request a new password link.");
        String account = (String) rows.get(0).get("account_id");
        int updated =
                db.update(
                        "UPDATE accounts SET password_hash=?,active=TRUE,credential_version=credential_version+1 WHERE id=? AND suspended=FALSE AND registration_status='approved' AND must_change_password=FALSE",
                        passwords.encode(password),
                        account);
        if (updated == 1) bridge.sync(account, true);
        if (updated != 1) throw invalid("Account is suspended. Contact the administrator.");
        db.update("UPDATE activation_tokens SET used=TRUE WHERE account_id=?", account);
        // Final onboarding step: the approved provider has set a password.
        for (String application :
                db.query(
                        "SELECT id FROM provider_applications WHERE account_id=? AND status='approved'",
                        (r, n) -> r.getString(1),
                        account)) {
            db.update(
                    "UPDATE provider_applications SET status='activated' WHERE id=?", application);
            db.update(
                    "INSERT INTO application_events(id,application_id,actor_id,from_status,to_status,note,created_at) VALUES(?,?,?,'approved','activated',NULL,?)",
                    UUID.randomUUID().toString(),
                    application,
                    account,
                    System.currentTimeMillis());
        }
    }
}
