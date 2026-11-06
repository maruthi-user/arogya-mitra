package in.arogyamitra.platform.controller.auth;

import com.fasterxml.jackson.annotation.JsonAlias;
import in.arogyamitra.platform.dto.users.UserDto;
import in.arogyamitra.platform.entity.users.UserSession;
import in.arogyamitra.platform.security.AuthCookies;
import in.arogyamitra.platform.security.CurrentUser;
import in.arogyamitra.platform.security.CurrentUserContext;
import in.arogyamitra.platform.security.PermissionService;
import in.arogyamitra.platform.service.auth.AuthService;
import in.arogyamitra.platform.service.auth.SessionService;
import in.arogyamitra.platform.service.auth.SessionService.IssuedTokens;
import in.arogyamitra.platform.service.users.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Login, token refresh, logout and device sessions. Browsers get the tokens as httpOnly cookies
 * only; with app.security.auth.tokens-in-body=true (API clients) they are also in the JSON body,
 * and refresh/logout accept the refresh token in the body.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;
    private final SessionService sessions;
    private final UserService users;
    private final PermissionService permissions;
    private final AuthCookies cookies;
    private final int maxFailedAttempts;
    private final boolean tokensInBody;

    public AuthController(
            AuthService auth,
            SessionService sessions,
            UserService users,
            PermissionService permissions,
            AuthCookies cookies,
            @Value("${app.security.max-failed-attempts:5}") int maxFailedAttempts,
            @Value("${app.security.auth.tokens-in-body:false}") boolean tokensInBody) {
        this.auth = auth;
        this.sessions = sessions;
        this.users = users;
        this.permissions = permissions;
        this.cookies = cookies;
        this.maxFailedAttempts = maxFailedAttempts;
        this.tokensInBody = tokensInBody;
    }

    /**
     * "username" is the username or the e-mail address; "email" is accepted as an alias of the same
     * field.
     */
    public record LoginRequest(
            @NotBlank @JsonAlias("email") String username, @NotBlank String password) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword, @NotBlank String newPassword) {}

    /** Only read when tokens-in-body is on; browsers send the refresh cookie instead. */
    public record RefreshRequest(String refreshToken) {}

    @PostMapping("/login")
    public Map<String, Object> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest http,
            HttpServletResponse response) {
        AuthService.LoginResult result =
                auth.login(
                        request.username(),
                        request.password(),
                        http.getRemoteAddr(),
                        http.getHeader(HttpHeaders.USER_AGENT));
        Map<String, Object> out = tokenResponse(result.tokens(), response);
        out.put("user", UserDto.from(result.tokens().user(), maxFailedAttempts));
        out.put("permissions", result.permissions());
        return out;
    }

    /**
     * New access token (and a new refresh token) for a valid refresh token; 401 and cleared cookies
     * otherwise.
     */
    @PostMapping("/refresh")
    public Map<String, Object> refresh(
            @RequestBody(required = false) RefreshRequest body,
            HttpServletRequest http,
            HttpServletResponse response) {
        try {
            IssuedTokens tokens =
                    sessions.refresh(
                            refreshToken(body, http),
                            http.getRemoteAddr(),
                            http.getHeader(HttpHeaders.USER_AGENT));
            return tokenResponse(tokens, response);
        } catch (BadCredentialsException e) {
            cookies.clear(response);
            throw e;
        }
    }

    /**
     * Ends this device's session. Always succeeds, so a client can call it with an expired token.
     */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(
            @RequestBody(required = false) RefreshRequest body,
            HttpServletRequest http,
            HttpServletResponse response) {
        sessions.revokeByRefreshToken(refreshToken(body, http));
        CurrentUserContext.get()
                .ifPresent(u -> sessions.revoke(u.getSessionId(), SessionService.REASON_LOGOUT));
        cookies.clear(response);
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        CurrentUser current = CurrentUserContext.require();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", UserDto.from(users.get(current.getId()), maxFailedAttempts));
        out.put("permissions", permissions.permissionsOf(current.getRole()));
        return out;
    }

    /** Also signs out every other device; this one stays signed in. */
    @PostMapping("/change-password")
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        CurrentUser current = CurrentUserContext.require();
        users.changePassword(
                current.getId(),
                request.currentPassword(),
                request.newPassword(),
                current.getSessionId());
    }

    public record SessionView(
            String id,
            String ipAddress,
            String userAgent,
            LocalDateTime createdAt,
            LocalDateTime lastSeenAt,
            LocalDateTime expiresAt,
            boolean current) {

        static SessionView of(UserSession s, String currentId) {
            return new SessionView(
                    s.getId(),
                    s.getIpAddress(),
                    s.getUserAgent(),
                    s.getCreatedAt(),
                    s.getLastSeenAt(),
                    s.getExpiresAt(),
                    s.getId().equals(currentId));
        }
    }

    /** The signed-in devices of the current user, most recently used first. */
    @GetMapping("/sessions")
    public List<SessionView> mySessions() {
        CurrentUser current = CurrentUserContext.require();
        return sessions.listActive(current.getId()).stream()
                .map(s -> SessionView.of(s, current.getSessionId()))
                .toList();
    }

    /**
     * Signs out one of the current user's devices (this one too, when it is the current session).
     */
    @DeleteMapping("/sessions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeSession(@PathVariable String id, HttpServletResponse response) {
        CurrentUser current = CurrentUserContext.require();
        sessions.revokeOwn(current.getId(), id);
        if (id.equals(current.getSessionId())) {
            cookies.clear(response);
        }
    }

    @PostMapping("/sessions/revoke-others")
    public Map<String, Object> revokeOtherSessions() {
        CurrentUser current = CurrentUserContext.require();
        int count =
                sessions.revokeAll(
                        current.getId(), current.getSessionId(), SessionService.REASON_REVOKED);
        return Map.of("revoked", count);
    }

    private Map<String, Object> tokenResponse(IssuedTokens tokens, HttpServletResponse response) {
        cookies.write(response, tokens);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("expiresInMs", tokens.accessExpiresInMs());
        out.put("sessionExpiresAt", tokens.sessionExpiresAt());
        if (tokensInBody) {
            out.put("token", tokens.accessToken());
            out.put("tokenType", "Bearer");
            if (tokens.refreshToken() != null) {
                out.put("refreshToken", tokens.refreshToken());
            }
        }
        return out;
    }

    private String refreshToken(RefreshRequest body, HttpServletRequest http) {
        String fromCookie = AuthCookies.read(http, AuthCookies.REFRESH);
        if (fromCookie != null) {
            return fromCookie;
        }
        return tokensInBody && body != null ? body.refreshToken() : null;
    }
}
