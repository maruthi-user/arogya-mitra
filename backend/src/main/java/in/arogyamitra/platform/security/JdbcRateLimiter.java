package in.arogyamitra.platform.security;

import in.arogyamitra.platform.exception.TooManyRequestsException;
import java.time.Duration;
import java.util.UUID;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sliding-window limiter backed by the database, so limits survive restarts and are shared by every
 * app instance. Replaces {@link InMemoryRateLimiter} as the default; counting and recording are not
 * one atomic step, so under a burst a key may get one or two attempts more than the limit, which is
 * acceptable here.
 */
@Primary
@Component
public class JdbcRateLimiter implements RateLimiter {
    private static final String MESSAGE = "Too many attempts. Please wait and try again later.";
    private static final long KEEP_MS = Duration.ofDays(1).toMillis();
    private final JdbcTemplate db;

    public JdbcRateLimiter(JdbcTemplate db) {
        this.db = db;
    }

    @Override
    @Transactional
    public void consume(String key, int maxAttempts, Duration window) {
        long now = System.currentTimeMillis();
        long since = now - window.toMillis();
        String limitKey = key.length() > 200 ? key.substring(0, 200) : key;
        Integer count =
                db.queryForObject(
                        "SELECT COUNT(*) FROM rate_limit_attempts WHERE limit_key=? AND attempted_at>?",
                        Integer.class,
                        limitKey,
                        since);
        if (count != null && count >= maxAttempts) {
            Long oldest =
                    db.queryForObject(
                            "SELECT MIN(attempted_at) FROM rate_limit_attempts WHERE limit_key=? AND attempted_at>?",
                            Long.class,
                            limitKey,
                            since);
            long retryAfterMs = (oldest == null ? now : oldest) + window.toMillis() - now;
            throw new TooManyRequestsException(
                    MESSAGE, (int) Math.max(1, (retryAfterMs + 999) / 1000));
        }
        db.update(
                "INSERT INTO rate_limit_attempts(id,limit_key,attempted_at) VALUES(?,?,?)",
                UUID.randomUUID().toString(),
                limitKey,
                now);
    }

    @Override
    public void reset(String key) {
        db.update(
                "DELETE FROM rate_limit_attempts WHERE limit_key=?",
                key.length() > 200 ? key.substring(0, 200) : key);
    }

    @Scheduled(fixedDelay = 600_000)
    void purgeOldAttempts() {
        db.update(
                "DELETE FROM rate_limit_attempts WHERE attempted_at<?",
                System.currentTimeMillis() - KEEP_MS);
    }
}
