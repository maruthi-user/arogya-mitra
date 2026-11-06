package in.arogyamitra.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

/**
 * Route protection and request validation over HTTP: /api is closed unless a route is listed as
 * public, and typed request bodies reject bad input with the usual {message} shape.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "spring.profiles.active=test",
            "server.address=127.0.0.1",
            "spring.datasource.url=jdbc:h2:mem:access;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1",
            "spring.datasource.username=sa",
            "spring.datasource.password=",
            "security.jwt.secret-key=dGVzdC1vbmx5LWp3dC1zZWNyZXQtZm9yLWludGVncmF0aW9uLXRlc3RzLTEyMzQ1Njc4OTA=",
            "app.notifications.scheduling=false",
            "app.bookings.expiry-job=false",
            "app.files.local-dir=target/test-uploads"
        })
class ApiAccessTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    @LocalServerPort int port;

    class Client {
        final HttpClient http =
                HttpClient.newBuilder()
                        .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                        .build();
        int status;
        JsonNode body;

        Client call(String method, String path, Object payload) throws Exception {
            var csrf =
                    JSON.readTree(
                            http.send(
                                            HttpRequest.newBuilder(uri("/api/auth/csrf")).build(),
                                            HttpResponse.BodyHandlers.ofString())
                                    .body());
            var request =
                    HttpRequest.newBuilder(uri(path))
                            .timeout(Duration.ofSeconds(20))
                            .header("Content-Type", "application/json")
                            .header("X-XSRF-TOKEN", csrf.get("token").asText())
                            .method(
                                    method,
                                    payload == null
                                            ? HttpRequest.BodyPublishers.noBody()
                                            : HttpRequest.BodyPublishers.ofString(
                                                    JSON.writeValueAsString(payload)));
            var response = http.send(request.build(), HttpResponse.BodyHandlers.ofString());
            status = response.statusCode();
            String text = response.body();
            body =
                    text == null || !text.trim().matches("^[\\[{].*")
                            ? JSON.nullNode()
                            : JSON.readTree(text);
            return this;
        }
    }

    URI uri(String path) {
        return URI.create("http://127.0.0.1:" + port + path);
    }

    @Test
    void publicCatalogIsOpenButPrivateRoutesNeedSignIn() throws Exception {
        var anonymous = new Client();
        assertThat(anonymous.call("GET", "/api/reference-data", null).status).isEqualTo(200);
        assertThat(anonymous.call("GET", "/api/providers", null).status).isEqualTo(200);
        assertThat(anonymous.call("GET", "/api/state", null).status).isEqualTo(200);
        assertThat(anonymous.call("GET", "/api/care/services", null).status).isEqualTo(200);

        assertThat(anonymous.call("GET", "/api/bookings", null).status).isEqualTo(401);
        assertThat(anonymous.call("GET", "/api/medicine-requests", null).status).isEqualTo(401);
        assertThat(anonymous.call("GET", "/api/onboarding/notifications", null).status)
                .isEqualTo(401);
        assertThat(anonymous.call("GET", "/api/patients", null).status).isEqualTo(401);
        // Routes outside /api are not served at all.
        assertThat(anonymous.call("GET", "/not-an-api", null).status).isIn(401, 403);
    }

    @Test
    void guestPatientCanReadOwnBookingsButNotAdminRoutes() throws Exception {
        var guest = new Client();
        assertThat(guest.call("POST", "/api/auth/guest", Map.of("language", "en")).status)
                .isEqualTo(200);
        assertThat(guest.body.get("role").asText()).isEqualTo("patient");

        assertThat(guest.call("GET", "/api/bookings", null).status).isEqualTo(200);
        assertThat(guest.body.isArray()).isTrue();
        assertThat(guest.call("GET", "/api/bookings?limit=501", null).status).isEqualTo(400);
        assertThat(guest.call("GET", "/api/patients", null).status).isEqualTo(403);
    }

    @Test
    void typedBodiesRejectBadInputWithAMessage() throws Exception {
        var anonymous = new Client();
        anonymous.call(
                "POST",
                "/api/auth/login",
                Map.of("username", "someone", "password", "x", "role", "superuser"));
        assertThat(anonymous.status).isEqualTo(400);
        assertThat(anonymous.body.get("message").asText()).isEqualTo("Invalid role");

        anonymous.call("POST", "/api/auth/request-setup", Map.of("email", "not-an-email"));
        assertThat(anonymous.status).isEqualTo(400);
        assertThat(anonymous.body.get("message").asText()).isEqualTo("Enter a valid email");

        var guest = new Client();
        guest.call("POST", "/api/auth/guest", Map.of());
        guest.call("POST", "/api/medicine-requests", Map.of("medicineId", "paracetamol"));
        assertThat(guest.status).isEqualTo(400);
        assertThat(guest.body.get("message").asText()).isEqualTo("Choose a pharmacy");

        guest.call("PATCH", "/api/bookings/missing", Map.of("status", "approved-by-me"));
        assertThat(guest.status).isEqualTo(400);
        assertThat(guest.body.get("message").asText()).isEqualTo("Invalid status");
    }
}
