package in.arogyamitra.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class WebConfiguration implements WebMvcConfigurer {
    @Value("${app.cors-origins:http://localhost:3000,http://127.0.0.1:3000}") String origins;
    @Override public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**").allowedOrigins(origins.split(","))
            .allowedMethods("GET","POST","PATCH").allowedHeaders("Content-Type","X-CSRF-TOKEN").allowCredentials(true);
    }
}
