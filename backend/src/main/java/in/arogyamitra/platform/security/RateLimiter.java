package in.arogyamitra.platform.security;

import java.time.Duration;

import in.arogyamitra.platform.exception.TooManyRequestsException;

/**
 * Counts attempts per key (e.g. "login:203.0.113.7:alice") in a sliding window. The default implementation is
 * in memory, so with several app instances each one counts on its own: add a Redis-backed implementation
 * (e.g. Bucket4j) marked @Primary when you scale out.
 */
public interface RateLimiter {

    /**
     * Records one attempt for key, or throws (HTTP 429 with Retry-After) when maxAttempts were already made
     * within window. A rejected attempt is not counted.
     */
    void consume(String key, int maxAttempts, Duration window) throws TooManyRequestsException;

    /** Forgets the attempts for key (e.g. after a successful login). */
    void reset(String key);
}
