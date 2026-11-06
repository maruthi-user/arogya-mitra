package in.arogyamitra.platform.config;

import in.arogyamitra.platform.service.email.EmailSender;
import in.arogyamitra.platform.service.email.EmailService;
import in.arogyamitra.platform.service.email.EmailTemplateRenderer;
import in.arogyamitra.platform.service.email.LoggingEmailSender;
import in.arogyamitra.platform.service.email.NotificationListener;
import in.arogyamitra.platform.service.email.SmtpEmailSender;
import in.arogyamitra.platform.spi.UserRefResolver;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.util.StringUtils;

/**
 * The email module. SMTP is used when spring.mail.host has a value (an empty value counts as none,
 * unlike Spring Boot's own check), otherwise emails are only logged so the app still starts.
 */
@Configuration
@ConditionalOnAppModule("email")
@EnableConfigurationProperties(EmailProperties.class)
public class EmailConfiguration {

    @Bean
    EmailTemplateRenderer emailTemplateRenderer() {
        return new EmailTemplateRenderer();
    }

    @Bean
    EmailSender emailSender(
            ObjectProvider<JavaMailSender> mailSender,
            Environment env,
            EmailProperties properties) {
        JavaMailSender mail = mailSender.getIfAvailable();
        if (mail != null && StringUtils.hasText(env.getProperty("spring.mail.host"))) {
            return new SmtpEmailSender(mail, properties);
        }
        return new LoggingEmailSender();
    }

    @Bean
    EmailService emailService(
            EmailSender sender,
            EmailTemplateRenderer renderer,
            EmailProperties properties,
            AppConfig config,
            @Value("${frontend.url:}") String frontendUrl) {
        return new EmailService(sender, renderer, properties, config, frontendUrl);
    }

    @Bean
    NotificationListener notificationListener(
            EmailService emails, UserRefResolver users, EmailProperties properties) {
        Executor executor =
                properties.isAsync()
                        ? Executors.newFixedThreadPool(
                                2,
                                runnable -> {
                                    Thread thread = new Thread(runnable, "email-sender");
                                    thread.setDaemon(true);
                                    return thread;
                                })
                        : Runnable::run;
        return new NotificationListener(emails, users, executor);
    }
}
