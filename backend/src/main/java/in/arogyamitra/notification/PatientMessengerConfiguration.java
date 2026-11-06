package in.arogyamitra.notification;

import java.time.Duration;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** Chooses the {@link PatientMessenger} from {@code app.messaging.provider} (log or webhook). */
@Configuration
public class PatientMessengerConfiguration {
    private static final Logger log = LoggerFactory.getLogger(PatientMessenger.class);

    @Bean
    @ConditionalOnProperty(
            name = "app.messaging.provider",
            havingValue = "log",
            matchIfMissing = true)
    PatientMessenger loggingPatientMessenger() {
        return (phone, text) ->
                log.info(
                        "Patient message to {} (not sent: app.messaging.provider=log): {}",
                        PatientMessenger.mask(phone),
                        text);
    }

    @Bean
    @ConditionalOnProperty(name = "app.messaging.provider", havingValue = "webhook")
    PatientMessenger webhookPatientMessenger(
            @Value("${app.messaging.webhook-url}") String url,
            @Value("${app.messaging.webhook-token:}") String token,
            @Value("${app.messaging.channel:sms}") String channel) {
        if (url == null || !url.startsWith("https://"))
            throw new IllegalStateException(
                    "app.messaging.webhook-url must be an https:// URL when app.messaging.provider=webhook");
        var timeouts = new SimpleClientHttpRequestFactory();
        timeouts.setConnectTimeout(Duration.ofSeconds(5));
        timeouts.setReadTimeout(Duration.ofSeconds(10));
        var client = RestClient.builder().baseUrl(url).requestFactory(timeouts).build();
        return (phone, text) -> {
            try {
                var request =
                        client.post()
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(Map.of("to", phone, "text", text, "channel", channel));
                if (!token.isBlank()) request = request.header("Authorization", "Bearer " + token);
                request.retrieve().toBodilessEntity();
            } catch (RuntimeException e) {
                log.warn(
                        "Patient message to {} failed: {}",
                        PatientMessenger.mask(phone),
                        e.getMessage());
            }
        };
    }
}
