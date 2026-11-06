package in.arogyamitra.platform.service.email;

import java.util.Map;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

/**
 * Renders HTML emails with a private Thymeleaf engine. Templates are looked up in {@code
 * templates/email/} first (the application's own, which wins) and then in {@code
 * templates/platform/email/} (the shipped defaults), so an app customises a mail by adding a file
 * with the same name. Variable values are HTML-escaped by Thymeleaf.
 */
public class EmailTemplateRenderer {

    private final TemplateEngine engine = new TemplateEngine();

    public EmailTemplateRenderer() {
        engine.addTemplateResolver(resolver("templates/email/", 1));
        engine.addTemplateResolver(resolver("templates/platform/email/", 2));
    }

    /**
     * @param template name without folder or {@code .html}, e.g. {@code password-reset}
     */
    public String render(String template, Map<String, Object> variables) {
        Context context = new Context();
        context.setVariables(variables);
        return engine.process(template, context);
    }

    private static ClassLoaderTemplateResolver resolver(String prefix, int order) {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix(prefix);
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        resolver.setOrder(order);
        resolver.setCheckExistence(true);
        return resolver;
    }
}
