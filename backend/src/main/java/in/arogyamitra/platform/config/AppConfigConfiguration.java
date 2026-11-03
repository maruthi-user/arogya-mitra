package in.arogyamitra.platform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class AppConfigConfiguration {

    @Bean
    public AppConfig appConfig(Environment environment) {
        return AppConfigLoader.load(environment);
    }
}
