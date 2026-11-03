package in.arogyamitra.platform.security;

import java.util.Date;
import java.util.Map;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import in.arogyamitra.platform.entity.users.AppUser;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${security.jwt.secret-key:}") String secret,
            @Value("${security.jwt.expiration-time}") long expirationMs) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "security.jwt.secret-key is not set. Set JWT_SECRET_KEY (generate with: openssl rand -base64 48).");
        }
        byte[] bytes;
        try {
            bytes = Decoders.BASE64.decode(secret);
        } catch (RuntimeException e) {
            throw new IllegalStateException("security.jwt.secret-key must be base64 (openssl rand -base64 48).", e);
        }
        if (bytes.length < 32) {
            throw new IllegalStateException("security.jwt.secret-key must decode to at least 32 bytes.");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationMs = expirationMs;
    }

    /** Short-lived access token bound to one session ("sid"); it is rejected as soon as that session is revoked. */
    public String generateToken(AppUser user, String sessionId) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .claims(Map.of("uid", user.getId(), "sid", sessionId, "role", user.getRole(), "name", user.getUsername()))
                .subject(user.getEmail())
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationMs))
                .signWith(key)
                .compact();
    }

    /**
     * The user in a valid, unexpired token, or null when the token is missing, forged, expired or has no session.
     * The caller still has to check the session is active (see SessionService.authenticate).
     */
    public CurrentUser parse(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            Number uid = claims.get("uid", Number.class);
            String role = claims.get("role", String.class);
            String sid = claims.get("sid", String.class);
            if (uid == null || role == null || sid == null || claims.getSubject() == null) {
                return null;
            }
            return new CurrentUser(uid.longValue(), claims.getSubject(), claims.get("name", String.class), role, sid);
        } catch (RuntimeException e) {
            return null;
        }
    }

    public long getExpirationMs() {
        return expirationMs;
    }
}
