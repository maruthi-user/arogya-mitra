package in.arogyamitra.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebConfiguration implements WebMvcConfigurer {
    @Value("${app.cors-origins:http://localhost:3002,http://127.0.0.1:3002}")
    String origins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(origins.split(","))
                .allowedMethods("GET", "POST", "PATCH", "PUT", "DELETE")
                .allowedHeaders("Content-Type", "X-CSRF-TOKEN", "X-XSRF-TOKEN", "Authorization")
                .allowCredentials(true);
    }
}
