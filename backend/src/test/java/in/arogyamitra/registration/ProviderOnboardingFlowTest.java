package in.arogyamitra.registration;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.arogyamitra.platform.exception.TooManyRequestsException;
import in.arogyamitra.platform.security.JdbcRateLimiter;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Two-step provider onboarding end to end over HTTP (Provider -> Verifier -> Admin -> activation),
 * on an in-memory H2 database in PostgreSQL mode so it needs no running Postgres or Docker.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "spring.profiles.active=test",
            "server.address=127.0.0.1",
            "spring.datasource.url=jdbc:h2:mem:onboarding;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1",
            "spring.datasource.username=sa",
            "spring.datasource.password=",
            "security.jwt.secret-key=dGVzdC1vbmx5LWp3dC1zZWNyZXQtZm9yLWludGVncmF0aW9uLXRlc3RzLTEyMzQ1Njc4OTA=",
            "app.admin.username=testadmin",
            "app.admin.email=testadmin@example.test",
            "app.admin.password=Admin#Test2026",
            "app.notifications.scheduling=false",
            "app.files.local-dir=target/test-uploads"
        })
class ProviderOnboardingFlowTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final List<String> ALL_CHECKS =
            List.of("identity", "qualification", "documents", "contact");
    @LocalServerPort int port;
    @Autowired JdbcTemplate db;
    @Autowired JdbcRateLimiter limiter;

    /** One browser-like client: keeps its own session cookies and sends the CSRF header. */
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
                    HttpRequest.newBuilder(uri("/api" + path))
                            .timeout(Duration.ofSeconds(20))
                            .header("Content-Type", "application/json")
                            .header("X-XSRF-TOKEN", csrf.get("token").asText())
                            .method(
                                    method,
                                    payload == null
                                            ? HttpRequest.BodyPublishers.noBody()
                                            : HttpRequest.BodyPublishers.ofString(
                                                    JSON.writeValueAsString(payload)));
            var response = http.send(request.build(), HttpResponse.BodyHandlers.ofByteArray());
            status = response.statusCode();
            String text = new String(response.body(), StandardCharsets.UTF_8);
            body =
                    text.isBlank() || !text.trim().matches("^[\\[{].*")
                            ? JSON.nullNode()
                            : JSON.readTree(text);
            raw = response.body();
            return this;
        }

        byte[] raw;
    }

    URI uri(String path) {
        return URI.create("http://127.0.0.1:" + port + path);
    }

    String activationToken(String email) {
        String body =
                db.queryForObject(
                        "SELECT body FROM email_outbox WHERE recipient=? AND body LIKE '%#activate=%' ORDER BY updated_at DESC LIMIT 1",
                        String.class, email);
        var matcher = Pattern.compile("#activate=([A-Za-z0-9_-]+)").matcher(body);
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    String status(String application) {
        return db.queryForObject(
                "SELECT status FROM provider_applications WHERE id=?", String.class, application);
    }

    Client login(String username, String password, String role) throws Exception {
        var client =
                new Client()
                        .call(
                                "POST",
                                "/auth/login",
                                Map.of("username", username, "password", password, "role", role));
        assertThat(client.status).as("login " + username).isEqualTo(200);
        return client;
    }

    Client verifier(String email) throws Exception {
        var admin = login("testadmin", "Admin#Test2026", "admin");
        admin.call("POST", "/admin/verifiers", Map.of("name", "Vani Verifier", "email", email));
        assertThat(admin.status).isEqualTo(201);
        assertThat(admin.body.get("status").asText()).isEqualTo("invited");
        var anon =
                new Client()
                        .call(
                                "POST",
                                "/auth/activate",
                                Map.of(
                                        "token",
                                        activationToken(email),
                                        "password",
                                        "Verify#2026a"));
        assertThat(anon.status).isEqualTo(200);
        return login(
                db.queryForObject(
                        "SELECT username FROM accounts WHERE email=?", String.class, email),
                "Verify#2026a",
                "verifier");
    }

    String register(String name, String email, String phone) throws Exception {
        var provider =
                new Client()
                        .call(
                                "POST",
                                "/auth/register",
                                Map.of(
                                        "name",
                                        name,
                                        "email",
                                        email,
                                        "phone",
                                        phone,
                                        "termsAccepted",
                                        true));
        assertThat(provider.status).isEqualTo(201);
        assertThat(provider.body.get("status").asText()).isEqualTo("pending_verification");
        return provider.body.get("id").asText();
    }

    static Map<String, Boolean> checks(List<String> names) {
        return names.stream().collect(java.util.stream.Collectors.toMap(n -> n, n -> true));
    }

    @Test
    void providerIsVerifiedThenApprovedThenActivates() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8),
                email = "ravi" + suffix + "@example.test";
        String application = register("Ravi Kumar", email, "9876543210");
        var admin = login("testadmin", "Admin#Test2026", "admin");

        admin.call(
                "POST",
                "/admin/applications/" + application + "/review",
                Map.of("decision", "approved"));
        assertThat(admin.status).as("admin cannot skip verification").isEqualTo(409);

        var verifier = verifier("vani" + suffix + "@example.test");
        assertThat(verifier.call("GET", "/admin/applications", null).status).isEqualTo(403);
        assertThat(verifier.call("GET", "/bookings", null).status).isEqualTo(403);
        assertThat(verifier.call("GET", "/state", null).body.get("bookings").size()).isZero();

        verifier.call(
                "POST",
                "/verification/applications/" + application + "/verify",
                Map.of("decision", "approved", "checks", checks(List.of("identity"))));
        assertThat(verifier.status).as("every check is required").isEqualTo(400);
        verifier.call(
                "POST",
                "/verification/applications/" + application + "/verify",
                Map.of("decision", "maybe"));
        assertThat(verifier.status).as("typed request rejects unknown decision").isEqualTo(400);
        assertThat(verifier.body.get("message").asText()).contains("approved or rejected");

        verifier.call(
                "POST",
                "/verification/applications/" + application + "/verify",
                Map.of(
                        "decision",
                        "approved",
                        "reason",
                        "License checked",
                        "checks",
                        checks(ALL_CHECKS)));
        assertThat(verifier.status).isEqualTo(200);
        assertThat(status(application)).isEqualTo("pending_admin");
        assertThat(
                        verifier.call(
                                        "POST",
                                        "/admin/applications/" + application + "/review",
                                        Map.of("decision", "approved"))
                                .status)
                .isEqualTo(403);

        admin.call(
                "POST",
                "/admin/applications/" + application + "/review",
                Map.of("decision", "approved", "reason", "Welcome"));
        assertThat(admin.status).isEqualTo(200);
        assertThat(status(application)).isEqualTo("approved");
        assertThat(
                        db.queryForObject(
                                "SELECT body FROM email_outbox WHERE recipient=? ORDER BY updated_at DESC LIMIT 1",
                                String.class,
                                email))
                .doesNotContainIgnoringCase("temporary password");

        String first = activationToken(email);
        assertThat(
                        admin.call(
                                        "POST",
                                        "/admin/applications/" + application + "/resend-activation",
                                        null)
                                .status)
                .isEqualTo(200);
        assertThat(
                        new Client()
                                .call(
                                        "POST",
                                        "/auth/activate",
                                        Map.of("token", first, "password", "Provider#2026a"))
                                .status)
                .as("resend invalidates the old link")
                .isEqualTo(400);
        assertThat(
                        new Client()
                                .call(
                                        "POST",
                                        "/auth/activate",
                                        Map.of(
                                                "token",
                                                activationToken(email),
                                                "password",
                                                "weakpassword"))
                                .status)
                .as("shared password policy needs a digit")
                .isEqualTo(400);
        assertThat(
                        new Client()
                                .call(
                                        "POST",
                                        "/auth/activate",
                                        Map.of(
                                                "token",
                                                activationToken(email),
                                                "password",
                                                "Provider#2026a"))
                                .status)
                .isEqualTo(200);
        assertThat(status(application)).isEqualTo("activated");
        login(email, "Provider#2026a", "provider");

        var history =
                admin.call("GET", "/admin/applications/" + application + "/history", null).body;
        assertThat(history.findValuesAsText("to"))
                .containsExactly(
                        "pending_verification",
                        "pending_admin",
                        "approved",
                        "approved",
                        "activated");
        assertThat(history.get(1).get("note").asText()).isEqualTo("License checked");
        assertThat(history.get(1).get("actorName").asText()).isEqualTo("Vani Verifier");
        assertThat(
                        db.queryForObject(
                                "SELECT name FROM provider_applications WHERE id=?",
                                String.class,
                                application))
                .isEqualTo("Ravi Kumar");
    }

    @Test
    void rejectionAtVerificationClosesTheApplication() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8),
                email = "sita" + suffix + "@example.test";
        String application = register("Sita Devi", email, "9876543211");
        var verifier = verifier("kiran" + suffix + "@example.test");

        assertThat(
                        verifier.call(
                                        "POST",
                                        "/verification/applications/" + application + "/verify",
                                        Map.of("decision", "rejected", "reason", "no"))
                                .status)
                .isEqualTo(400);
        assertThat(
                        verifier.call(
                                        "POST",
                                        "/verification/applications/" + application + "/verify",
                                        Map.of(
                                                "decision",
                                                "rejected",
                                                "reason",
                                                "License number does not exist"))
                                .status)
                .isEqualTo(200);
        assertThat(status(application)).isEqualTo("verification_rejected");
        assertThat(
                        db.queryForObject(
                                "SELECT registration_status FROM accounts WHERE email=?",
                                String.class,
                                email))
                .isEqualTo("rejected");

        var admin = login("testadmin", "Admin#Test2026", "admin");
        assertThat(
                        admin.call(
                                        "POST",
                                        "/admin/applications/" + application + "/review",
                                        Map.of("decision", "approved"))
                                .status)
                .isEqualTo(409);

        String verifierId =
                db.queryForObject(
                        "SELECT id FROM accounts WHERE email=?",
                        String.class,
                        "kiran" + suffix + "@example.test");
        assertThat(
                        admin.call(
                                        "PATCH",
                                        "/admin/verifiers/" + verifierId,
                                        Map.of("suspended", true))
                                .status)
                .isEqualTo(200);
        assertThat(verifier.call("GET", "/verification/applications", null).status)
                .as("suspended verifier is signed out")
                .isNotEqualTo(200);
    }

    @Test
    void documentsAreKeptInFileStorageAndReadableByTheVerifier() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        byte[] pdf = "%PDF-1.4\n% test document\n%%EOF\n".getBytes(StandardCharsets.US_ASCII);
        var provider =
                new Client()
                        .call(
                                "POST",
                                "/auth/register",
                                Map.ofEntries(
                                        Map.entry("name", "Lakshmi Clinic"),
                                        Map.entry("email", "lakshmi" + suffix + "@example.test"),
                                        Map.entry("phone", "9876500011"),
                                        Map.entry("termsAccepted", true),
                                        Map.entry("organization", "Lakshmi Clinic"),
                                        Map.entry("designation", "mbbs"),
                                        Map.entry("village", "town"),
                                        Map.entry("businessType", "clinic"),
                                        Map.entry("address", "Main road, near bus stand"),
                                        Map.entry("registrationId", "AP-12345"),
                                        Map.entry(
                                                "documents",
                                                List.of(
                                                        Map.of(
                                                                "name",
                                                                "license.pdf",
                                                                "type",
                                                                "application/pdf",
                                                                "content",
                                                                Base64.getEncoder()
                                                                        .encodeToString(pdf))))));
        assertThat(provider.status).isEqualTo(201);
        String application = provider.body.get("id").asText();
        assertThat(
                        db.queryForObject(
                                "SELECT storage_key FROM application_documents WHERE application_id=?",
                                String.class,
                                application))
                .startsWith("application-documents/");
        assertThat(
                        db.queryForObject(
                                "SELECT organization FROM provider_applications WHERE id=?",
                                String.class,
                                application))
                .isEqualTo("Lakshmi Clinic");

        var verifier = verifier("anil" + suffix + "@example.test");
        var documents =
                verifier.call(
                                "GET",
                                "/verification/applications/" + application + "/documents",
                                null)
                        .body;
        assertThat(documents).hasSize(1);
        verifier.call(
                "GET", "/verification/documents/" + documents.get(0).get("id").asText(), null);
        assertThat(verifier.status).isEqualTo(200);
        assertThat(verifier.raw).isEqualTo(pdf);
    }

    @Test
    void sharedRateLimiterBlocksAfterTheLimit() {
        String key = "test:" + UUID.randomUUID();
        limiter.consume(key, 2, Duration.ofMinutes(1));
        limiter.consume(key, 2, Duration.ofMinutes(1));
        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> limiter.consume(key, 2, Duration.ofMinutes(1)))
                .isInstanceOf(TooManyRequestsException.class);
        limiter.reset(key);
        limiter.consume(key, 2, Duration.ofMinutes(1));
    }
}
