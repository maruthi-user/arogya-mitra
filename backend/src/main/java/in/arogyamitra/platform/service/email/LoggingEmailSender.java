package in.arogyamitra.platform.service.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Used when no mail server is configured (typical on a developer machine). Logs recipient and subject only:
 * bodies carry reset tokens and must not end up in log files.
 */
public class LoggingEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

    @Override
    public boolean send(EmailMessage message) {
        log.warn("[EMAIL-NOT-SENT] no mail server configured (spring.mail.host). type={} to={} subject={}",
                message.type(), String.join(",", message.to()), message.subject());
        return false;
    }
}
