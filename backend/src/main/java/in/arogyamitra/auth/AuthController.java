package in.arogyamitra.auth;

import static in.arogyamitra.shared.ApiInput.*;

import in.arogyamitra.auth.dto.AuthRequests;
import in.arogyamitra.patient.PatientService;
import in.arogyamitra.patient.dto.PatientRequests;
import in.arogyamitra.registration.ProviderApplicationService;
import in.arogyamitra.security.*;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @org.springframework.beans.factory.annotation.Autowired
    private in.arogyamitra.patient.PatientRegistrationService patientRegistration;

    @PostMapping("/patients/register")
    public Map<String, Object> registerPatient(
            @Valid @RequestBody PatientRequests.RegisterPatientRequest input,
            HttpServletRequest request) {
        throttle.check("patient-register:" + request.getRemoteAddr(), 10);
        return patientRegistration.register(input.toInput());
    }

    private final org.springframework.jdbc.core.JdbcTemplate db;
    private final InitialPasswordService initialPasswords;
    private final AccountRepository accounts;
    private final PasswordEncoder passwords;
    private final SecurityContextRepository contexts;
    private final CsrfTokenRepository csrf;
    private final AccessService access;
    private final PatientService patients;
    private final ProviderApplicationService applications;
    private final ActivationService activation;
    private final RequestThrottle throttle;
    private final in.arogyamitra.platform.service.auth.AuthService platformAuth;
    private final in.arogyamitra.platform.service.auth.SessionService platformSessions;
    private final in.arogyamitra.platform.security.AuthCookies platformCookies;

    private String dummyHash;

    public AuthController(
            AccountRepository accounts,
            PasswordEncoder passwords,
            SecurityContextRepository contexts,
            CsrfTokenRepository csrf,
            AccessService access,
            PatientService patients,
            ProviderApplicationService applications,
            ActivationService activation,
            RequestThrottle throttle,
            in.arogyamitra.platform.service.auth.AuthService platformAuth,
            in.arogyamitra.platform.service.auth.SessionService platformSessions,
            in.arogyamitra.platform.security.AuthCookies platformCookies,
            org.springframework.jdbc.core.JdbcTemplate db,
            InitialPasswordService initialPasswords) {
        this.db = db;
        this.initialPasswords = initialPasswords;
        this.platformAuth = platformAuth;
        this.platformSessions = platformSessions;
        this.platformCookies = platformCookies;
        this.accounts = accounts;
        this.passwords = passwords;
        this.contexts = contexts;
        this.csrf = csrf;
        this.access = access;
        this.patients = patients;
        this.applications = applications;
        this.activation = activation;
        this.throttle = throttle;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }

    @GetMapping("/session")
    public Map<String, Object> session() {
        var user = access.optional();
        if (user == null) return Map.of("role", "anonymous");
        return Map.of(
                "role",
                user.role(),
                "accountId",
                user.accountId(),
                "subjectId",
                user.subjectId(),
                "name",
                user.displayName(),
                "mustChangePassword",
                !user.accountId().isBlank()
                        && db.queryForObject(
                                "SELECT must_change_password FROM accounts WHERE id=?",
                                Boolean.class,
                                user.accountId()),
                "profile",
                user.role().equals("patient") ? patients.get(user.subjectId()) : Map.of());
    }

    private void establish(
            Identity identity, HttpServletRequest request, HttpServletResponse response) {
        request.getSession();
        request.changeSessionId();
        var auth =
                UsernamePasswordAuthenticationToken.authenticated(
                        identity,
                        null,
                        List.of(
                                new SimpleGrantedAuthority(
                                        "ROLE_" + identity.role().toUpperCase(Locale.ROOT))));
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        new CsrfAuthenticationStrategy(csrf).onAuthentication(auth, request, response);
        access.forget();
    }

    @PostMapping("/guest")
    public Map<String, Object> guest(
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request,
            HttpServletResponse response) {
        platformSessions.revokeByRefreshToken(
                in.arogyamitra.platform.security.AuthCookies.read(
                        request, in.arogyamitra.platform.security.AuthCookies.REFRESH));
        platformCookies.clear(response);
        var previous = access.optional();
        if (previous != null && previous.role().equals("patient")) return session();
        throttle.check("guest:" + request.getRemoteAddr(), 40);
        String language = body != null && "en".equals(body.get("language")) ? "en" : "te";
        var profile =
                patients.create(
                        Map.of(
                                "name",
                                "Guest",
                                "village",
                                patients.defaultVillage(),
                                "language",
                                language));
        establish(
                new Identity("", "patient", (String) profile.get("id"), "Guest"),
                request,
                response);
        return session();
    }

    @PostMapping("/login")
    public Map<String, Object> login(
            @Valid @RequestBody AuthRequests.LoginRequest body,
            HttpServletRequest request,
            HttpServletResponse response) {
        String identifier = body.username().toLowerCase(Locale.ROOT), role = body.role();
        if (role.equals("patient")) identifier = identifier.trim().replaceFirst("^\\+91", "");
        String password = body.password();
        if (password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
            throw invalid("Invalid password");
        throttle.check("login:" + request.getRemoteAddr(), 20);
        var row = accounts.login(identifier);
        String candidate = accounts.credentialHash(identifier).orElse(dummyHash);
        boolean matches = passwords.matches(password, candidate);
        if (row.isEmpty()
                || !role.equals(row.get().get("role"))
                || !Boolean.TRUE.equals(row.get().get("active"))
                || !"approved".equals(row.get().get("registration_status"))
                || !matches)
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Unable to sign in. Check your credentials and account activation.");
        var result =
                platformAuth.login(
                        identifier,
                        password,
                        request.getRemoteAddr(),
                        request.getHeader("User-Agent"));
        platformCookies.write(response, result.tokens());
        // Registered users are authenticated only by the platform JWT cookies written above.
        // Guests keep a server session (they have no platform user); drop it so the JWT identity
        // is the one used from here on.
        var existing = request.getSession(false);
        if (existing != null) existing.removeAttribute("SPRING_SECURITY_CONTEXT");
        var u = result.tokens().user();
        var identity =
                new in.arogyamitra.platform.security.CurrentUser(
                        u.getId(),
                        u.getEmail(),
                        u.getUsername(),
                        u.getRole(),
                        result.tokens().sessionId());
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        identity,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole()))));
        SecurityContextHolder.setContext(context);
        access.forget();
        return session();
    }

    @PostMapping("/logout")
    public Map<String, Boolean> logout(HttpServletRequest request, HttpServletResponse response) {
        platformSessions.revokeByRefreshToken(
                in.arogyamitra.platform.security.AuthCookies.read(
                        request, in.arogyamitra.platform.security.AuthCookies.REFRESH));
        in.arogyamitra.platform.security.CurrentUserContext.get()
                .ifPresent(u -> platformSessions.revoke(u.getSessionId(), "LOGOUT"));
        platformCookies.clear(response);
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        access.forget();
        return Map.of("ok", true);
    }

    @PostMapping("/change-initial-password")
    public Map<String, String> changeInitialPassword(
            @Valid @RequestBody AuthRequests.ChangeInitialPasswordRequest body,
            HttpServletRequest request,
            HttpServletResponse response) {
        initialPasswords.change(body.currentPassword(), body.newPassword());
        platformCookies.clear(response);
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return Map.of("message", "Password changed. Sign in with your new password.");
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> register(
            @RequestBody Map<String, Object> body, HttpServletRequest request) {
        throttle.check("register:" + request.getRemoteAddr(), 10);
        return applications.submit(body);
    }

    @PostMapping("/activate")
    public Map<String, String> activate(
            @Valid @RequestBody AuthRequests.ActivateRequest body, HttpServletRequest request) {
        throttle.check("activate:" + request.getRemoteAddr(), 20);
        activation.activate(body.token(), body.password());
        return Map.of("message", "Password saved. You can now sign in.");
    }

    @PostMapping("/request-setup")
    public Map<String, String> requestSetup(
            @Valid @RequestBody AuthRequests.SetupRequest body, HttpServletRequest request) {
        throttle.check("setup:" + request.getRemoteAddr(), 5);
        activation.request(body.email());
        return Map.of("message", "If an eligible account exists, a password link will be emailed.");
    }
}
