package in.arogyamitra.notification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;

@Configuration
@EnableScheduling
@ConditionalOnProperty(name="app.notifications.scheduling",havingValue="true",matchIfMissing=true)
public class NotificationWorker {
    private final NotificationService notifications;
    public NotificationWorker(NotificationService notifications){this.notifications=notifications;}
    @Scheduled(fixedDelayString="${app.notifications.interval:10000}") public void send(){notifications.deliver();}
}
