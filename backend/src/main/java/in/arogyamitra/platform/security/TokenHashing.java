package in.arogyamitra.platform.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Random opaque tokens (refresh tokens, reset links) and the SHA-256 hash that is stored instead of
 * them.
 */
public final class TokenHashing {

    private static final SecureRandom RANDOM = new SecureRandom();

    private TokenHashing() {}

    /** 256 random bits, URL-safe base64 without padding. */
    public static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** Lower-case hex SHA-256 (64 characters). */
    public static String sha256(String token) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
