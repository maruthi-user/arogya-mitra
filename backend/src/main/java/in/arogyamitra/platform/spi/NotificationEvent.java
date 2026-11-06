package in.arogyamitra.platform.spi;

import java.util.Map;

/**
 * "Tell this person something." Published by any module through ApplicationEventPublisher; the
 * email module sends it after the surrounding transaction commits, or drops it when the module is
 * disabled.
 *
 * <p>Address the person by {@code userId} (their account email is looked up) or by a plain {@code
 * email} (invitations, password reset). {@code template} names an HTML file under {@code
 * templates/email/} (the application's own) or {@code templates/platform/email/} (shipped
 * defaults).
 */
public record NotificationEvent(
        Long userId,
        String email,
        String type,
        String subject,
        String template,
        Map<String, Object> variables) {

    public static NotificationEvent toUser(
            Long userId,
            String type,
            String subject,
            String template,
            Map<String, Object> variables) {
        return new NotificationEvent(
                userId, null, type, subject, template, variables == null ? Map.of() : variables);
    }

    public static NotificationEvent toAddress(
            String email,
            String type,
            String subject,
            String template,
            Map<String, Object> variables) {
        return new NotificationEvent(
                null, email, type, subject, template, variables == null ? Map.of() : variables);
    }

    /**
     * A message with a heading, paragraphs and an optional button, rendered by the shipped
     * "notification" template.
     */
    public static NotificationEvent message(
            Long userId,
            String type,
            String subject,
            String heading,
            java.util.List<String> paragraphs) {
        return toUser(
                userId,
                type,
                subject,
                "notification",
                Map.of("heading", heading, "paragraphs", paragraphs));
    }
}
