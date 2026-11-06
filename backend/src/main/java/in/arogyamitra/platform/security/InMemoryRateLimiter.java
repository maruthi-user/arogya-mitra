package in.arogyamitra.platform.security;

import in.arogyamitra.platform.exception.TooManyRequestsException;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Sliding-window log per key. Keys with no attempt in the last hour are dropped every 10 minutes.
 */
@Component
public class InMemoryRateLimiter implements RateLimiter {

    private static final String MESSAGE = "Too many attempts. Please wait and try again later.";
    private static final long IDLE_MS = Duration.ofHours(1).toMillis();

    private final Map<String, Deque<Long>> attempts = new ConcurrentHashMap<>();

    @Override
    public void consume(String key, int maxAttempts, Duration window) {
        long now = System.currentTimeMillis();
        long windowMs = window.toMillis();
        Deque<Long> log = attempts.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (log) {
            while (!log.isEmpty() && log.peekFirst() <= now - windowMs) {
                log.pollFirst();
            }
            if (log.size() >= maxAttempts) {
                long retryAfterMs = log.peekFirst() + windowMs - now;
                throw new TooManyRequestsException(
                        MESSAGE, (int) Math.max(1, (retryAfterMs + 999) / 1000));
            }
            log.addLast(now);
        }
    }

    @Override
    public void reset(String key) {
        attempts.remove(key);
    }

    @Scheduled(fixedDelay = 600_000)
    void evictIdleKeys() {
        long cutoff = System.currentTimeMillis() - IDLE_MS;
        attempts.entrySet()
                .removeIf(
                        e -> {
                            synchronized (e.getValue()) {
                                Long last = e.getValue().peekLast();
                                return last == null || last < cutoff;
                            }
                        });
    }
}
