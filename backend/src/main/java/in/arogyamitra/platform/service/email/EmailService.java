package in.arogyamitra.platform.service.email;

import in.arogyamitra.platform.config.AppConfig;
import in.arogyamitra.platform.config.EmailProperties;
import java.time.Year;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;

/**
 * Renders a template and sends it. Branding (productName, companyName, logoUrl, currentYear) is
 * added to every template's variables, defaulting to the name and company in app-config.json. A
 * failure never propagates: a mail problem must not break the business operation that triggered it.
 * A missing template sends nothing rather than mailing an error page to the recipient.
 */
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final EmailSender sender;
    private final EmailTemplateRenderer renderer;
    private final EmailProperties properties;
    private final AppConfig config;
    private final String frontendUrl;

    public EmailService(
            EmailSender sender,
            EmailTemplateRenderer renderer,
            EmailProperties properties,
            AppConfig config,
            String frontendUrl) {
        this.sender = sender;
        this.renderer = renderer;
        this.properties = properties;
        this.config = config;
        this.frontendUrl = frontendUrl == null ? "" : frontendUrl;
    }

    public boolean send(
            String to,
            String subject,
            String template,
            Map<String, Object> variables,
            String type) {
        return send(List.of(to), List.of(), subject, template, variables, type);
    }

    public boolean send(
            List<String> to,
            List<String> cc,
            String subject,
            String template,
            Map<String, Object> variables,
            String type) {
        List<String> recipients = clean(to);
        if (recipients.isEmpty()) {
            log.warn("[EMAIL-SKIPPED] type={} reason=no recipient", type);
            return false;
        }
        try {
            String html = renderer.render(template, withBranding(variables));
            return sender.send(new EmailMessage(recipients, clean(cc), subject, html, type));
        } catch (Exception e) {
            log.error(
                    "[EMAIL-FAILURE] type={} to={} could not render template '{}': {}",
                    type,
                    String.join(",", recipients),
                    template,
                    e.getMessage());
            return false;
        }
    }

    private Map<String, Object> withBranding(Map<String, Object> variables) {
        Map<String, Object> all = new HashMap<>();
        all.put(
                "productName",
                StringUtils.hasText(properties.getProductName())
                        ? properties.getProductName()
                        : config.app().name());
        all.put(
                "companyName",
                StringUtils.hasText(properties.getCompanyName())
                        ? properties.getCompanyName()
                        : config.app().company());
        all.put("logoUrl", properties.getLogoUrl());
        all.put("frontendUrl", frontendUrl);
        all.put("currentYear", Year.now().getValue());
        if (variables != null) {
            all.putAll(variables);
        }
        return all;
    }

    private static List<String> clean(List<String> addresses) {
        if (addresses == null) {
            return List.of();
        }
        return addresses.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
    }
}
