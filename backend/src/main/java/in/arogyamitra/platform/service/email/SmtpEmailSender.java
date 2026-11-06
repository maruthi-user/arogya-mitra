package in.arogyamitra.platform.service.email;

import in.arogyamitra.platform.config.EmailProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.util.StringUtils;

/** Sends through Spring's JavaMailSender, configured by the standard spring.mail.* properties. */
public class SmtpEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailSender.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String fromName;

    public SmtpEmailSender(JavaMailSender mailSender, EmailProperties properties) {
        if (!StringUtils.hasText(properties.getFromAddress())) {
            throw new IllegalStateException(
                    "app.email.from-address must be set when spring.mail.host is configured.");
        }
        this.mailSender = mailSender;
        this.fromAddress = properties.getFromAddress();
        this.fromName = properties.getFromName();
    }

    @Override
    public boolean send(EmailMessage message) {
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper =
                    new MimeMessageHelper(mime, true, StandardCharsets.UTF_8.name());
            setFrom(helper);
            helper.setTo(message.to().toArray(String[]::new));
            if (message.cc() != null && !message.cc().isEmpty()) {
                helper.setCc(message.cc().toArray(String[]::new));
            }
            helper.setSubject(message.subject());
            helper.setText(message.htmlBody(), true);
            mailSender.send(mime);
            log.info("[EMAIL-SENT] type={} to={}", message.type(), String.join(",", message.to()));
            return true;
        } catch (Exception e) {
            // One greppable line for "why did this email not arrive".
            log.error(
                    "[EMAIL-FAILURE] type={} to={} error={}: {}",
                    message.type(),
                    String.join(",", message.to()),
                    e.getClass().getName(),
                    e.getMessage());
            return false;
        }
    }

    private void setFrom(MimeMessageHelper helper) throws MessagingException {
        try {
            if (StringUtils.hasText(fromName)) {
                helper.setFrom(fromAddress, fromName);
                return;
            }
        } catch (UnsupportedEncodingException e) {
            log.warn("Unsupported encoding for from name '{}', using address only", fromName);
        }
        helper.setFrom(fromAddress);
    }
}
