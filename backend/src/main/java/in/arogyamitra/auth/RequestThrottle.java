package in.arogyamitra.auth;

import in.arogyamitra.platform.exception.TooManyRequestsException;
import in.arogyamitra.platform.security.RateLimiter;
import java.time.Duration;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Healthcare endpoints' throttle: allows {@code limit} attempts per key in 15 minutes, via the
 * shared limiter.
 */
@Component
public class RequestThrottle {
    private static final Duration WINDOW = Duration.ofMinutes(15);
    private final RateLimiter limiter;

    public RequestThrottle(RateLimiter limiter) {
        this.limiter = limiter;
    }

    public void check(String key, int limit) {
        try {
            limiter.consume("am:" + key, limit, WINDOW);
        } catch (TooManyRequestsException e) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please try again later.");
        }
    }
}
