package in.arogyamitra.booking;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Expires unanswered appointment requests in the background (default: every minute). */
@Component
@ConditionalOnProperty(
        name = "app.bookings.expiry-job",
        havingValue = "true",
        matchIfMissing = true)
public class BookingExpiryJob {
    private static final Logger log = LoggerFactory.getLogger(BookingExpiryJob.class);
    private final BookingService bookings;

    public BookingExpiryJob(BookingService bookings) {
        this.bookings = bookings;
    }

    @Scheduled(
            fixedDelayString = "${app.bookings.expiry-interval:60000}",
            initialDelayString = "${app.bookings.expiry-interval:60000}")
    public void run() {
        int expired = bookings.expirePending();
        if (expired > 0) log.info("Expired {} unanswered appointment request(s)", expired);
    }
}
