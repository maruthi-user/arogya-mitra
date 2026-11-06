package in.arogyamitra.notification;

/**
 * Sends a short text message (SMS or WhatsApp) to a patient's mobile number. Patients usually have
 * no email address, so booking updates reach them this way.
 *
 * <p>Pick the implementation with {@code app.messaging.provider}:
 *
 * <ul>
 *   <li>{@code log} (default): writes a masked line to the log and sends nothing. For local work.
 *   <li>{@code webhook}: POSTs {@code {"to","text","channel"}} to {@code app.messaging.webhook-url}
 *       so any SMS/WhatsApp gateway (or a small adapter in front of one) can deliver it.
 * </ul>
 *
 * Failures are logged and never undo the booking change that triggered the message.
 */
public interface PatientMessenger {
    void send(String phone, String text);

    /** "******3210": enough to recognise a number in logs without storing it. */
    static String mask(String phone) {
        if (phone == null || phone.length() < 4) return "****";
        return "*".repeat(phone.length() - 4) + phone.substring(phone.length() - 4);
    }
}
