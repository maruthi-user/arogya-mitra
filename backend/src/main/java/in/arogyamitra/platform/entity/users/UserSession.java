package in.arogyamitra.platform.entity.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One signed-in device. The access token carries this id ("sid") and is only accepted while the row
 * is active; the refresh token is rotated on every use and only its hash is kept. The previous hash
 * is kept too, so a replayed (stolen) refresh token can be recognised.
 */
@Entity
@Table(name = "USER_SESSIONS")
public class UserSession {

    @Id
    @Column(name = "ID", length = 36)
    private String id;

    @Column(name = "USER_ID", nullable = false)
    private Long userId;

    @Column(name = "REFRESH_TOKEN_HASH", nullable = false, unique = true, length = 64)
    private String refreshTokenHash;

    @Column(name = "PREVIOUS_TOKEN_HASH", length = 64)
    private String previousTokenHash;

    @Column(name = "ROTATED_AT")
    private LocalDateTime rotatedAt;

    @Column(name = "IP_ADDRESS", length = 64)
    private String ipAddress;

    @Column(name = "USER_AGENT", length = 300)
    private String userAgent;

    @Column(name = "CREATED_AT", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "LAST_SEEN_AT", nullable = false)
    private LocalDateTime lastSeenAt;

    /** Idle expiry: moved forward on every refresh, never past absoluteExpiresAt. */
    @Column(name = "EXPIRES_AT", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "ABSOLUTE_EXPIRES_AT", nullable = false)
    private LocalDateTime absoluteExpiresAt;

    @Column(name = "REVOKED_AT")
    private LocalDateTime revokedAt;

    @Column(name = "REVOKE_REASON", length = 40)
    private String revokeReason;

    protected UserSession() {}

    public UserSession(
            Long userId,
            String refreshTokenHash,
            String ipAddress,
            String userAgent,
            LocalDateTime now,
            LocalDateTime expiresAt,
            LocalDateTime absoluteExpiresAt) {
        this.id = UUID.randomUUID().toString();
        this.userId = userId;
        this.refreshTokenHash = refreshTokenHash;
        this.ipAddress = truncate(ipAddress, 64);
        this.userAgent = truncate(userAgent, 300);
        this.createdAt = now;
        this.lastSeenAt = now;
        this.expiresAt = expiresAt;
        this.absoluteExpiresAt = absoluteExpiresAt;
    }

    public boolean isActive(LocalDateTime now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }

    /** Replaces the refresh token; the old hash is remembered for reuse detection. */
    public void rotate(
            String newHash,
            LocalDateTime now,
            LocalDateTime newExpiresAt,
            String ip,
            String agent) {
        this.previousTokenHash = this.refreshTokenHash;
        this.refreshTokenHash = newHash;
        this.rotatedAt = now;
        this.lastSeenAt = now;
        this.expiresAt = newExpiresAt.isAfter(absoluteExpiresAt) ? absoluteExpiresAt : newExpiresAt;
        this.ipAddress = truncate(ip, 64);
        this.userAgent = truncate(agent, 300);
    }

    public void revoke(LocalDateTime now, String reason) {
        if (revokedAt == null) {
            this.revokedAt = now;
            this.revokeReason = reason;
        }
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }

    public String getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public LocalDateTime getRotatedAt() {
        return rotatedAt;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getLastSeenAt() {
        return lastSeenAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public LocalDateTime getRevokedAt() {
        return revokedAt;
    }

    public String getRevokeReason() {
        return revokeReason;
    }
}
