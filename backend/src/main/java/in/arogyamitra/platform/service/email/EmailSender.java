package in.arogyamitra.platform.service.email;

/** Delivery channel for a rendered email. Replace the bean to use another provider (SES, Brevo API, ...). */
public interface EmailSender {

    /** @return true when the message was handed to the provider; never throws for delivery problems. */
    boolean send(EmailMessage message);
}
