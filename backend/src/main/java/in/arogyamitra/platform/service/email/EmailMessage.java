package in.arogyamitra.platform.service.email;

import java.util.List;

/**
 * A rendered email ready to send. {@code type} is a short label (for example PASSWORD-RESET) used only in
 * logs, so delivery problems can be grepped by kind.
 */
public record EmailMessage(List<String> to, List<String> cc, String subject, String htmlBody, String type) {
}
