package in.arogyamitra.platform.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Gives Swagger UI an "Authorize" button for the JWT: log in at /api/v1/auth/login, paste the token
 * (without the word Bearer) and every call from the page is sent with it.
 */
@Configuration
public class OpenApiConfiguration {

    @Bean
    OpenAPI openApi(AppConfig config) {
        return new OpenAPI()
                .info(new Info().title(config.app().name() + " API"))
                .components(
                        new Components()
                                .addSecuritySchemes(
                                        "bearerAuth",
                                        new SecurityScheme()
                                                .type(SecurityScheme.Type.HTTP)
                                                .scheme("bearer")
                                                .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
