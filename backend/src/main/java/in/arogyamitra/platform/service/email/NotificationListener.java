package in.arogyamitra.platform.service.email;

import java.util.concurrent.Executor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.util.StringUtils;

import in.arogyamitra.platform.spi.NotificationEvent;
import in.arogyamitra.platform.spi.UserRef;
import in.arogyamitra.platform.spi.UserRefResolver;

/**
 * Turns {@link NotificationEvent}s into emails. Runs only after the publishing transaction commits, so a rolled
 * back change never sends mail, and (when async) off the request thread so a slow mail server neither slows the
 * response nor reveals through timing whether an address exists.
 */
public class NotificationListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationListener.class);

    private final EmailService emails;
    private final UserRefResolver users;
    private final Executor executor;

    public NotificationListener(EmailService emails, UserRefResolver users, Executor executor) {
        this.emails = emails;
        this.users = users;
        this.executor = executor;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void on(NotificationEvent event) {
        // Resolve the address now (inside the caller's context), deliver on the executor.
        String address = event.email();
        if (!StringUtils.hasText(address) && event.userId() != null) {
            address = users.find(event.userId()).map(UserRef::getEmail).orElse(null);
        }
        if (!StringUtils.hasText(address)) {
            log.warn("[EMAIL-SKIPPED] type={} reason=no address", event.type());
            return;
        }
        String to = address;
        executor.execute(() -> emails.send(to, event.subject(), event.template(), event.variables(), event.type()));
    }
}
