package in.arogyamitra.security;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccessService {
    private final org.springframework.jdbc.core.JdbcTemplate db;

    public AccessService(org.springframework.jdbc.core.JdbcTemplate db) {
        this.db = db;
    }

    /** Request attribute holding the identity already resolved for this request. */
    private static final String RESOLVED = AccessService.class.getName() + ".identity";

    /** Marker stored when the request is anonymous, so the lookup is not repeated either. */
    private static final Object ANONYMOUS = new Object();

    /**
     * The signed-in healthcare identity, or null. Two kinds of principal exist:
     *
     * <ul>
     *   <li>{@link Identity}: a guest patient held in the server session.
     *   <li>{@link in.arogyamitra.platform.security.CurrentUser}: a registered user signed in with
     *       the platform JWT. It is linked to its {@code accounts} row by username, which is unique
     *       in both {@code accounts} and {@code APP_USERS} and copied between them by
     *       PlatformAccountBridge.
     * </ul>
     *
     * The result is cached on the current request so the accounts lookup runs at most once per
     * request instead of once per access check.
     */
    public Identity optional() {
        var attributes = RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            var cached = attributes.getAttribute(RESOLVED, RequestAttributes.SCOPE_REQUEST);
            if (cached == ANONYMOUS) return null;
            if (cached instanceof Identity identity) return identity;
        }
        var identity = resolve();
        if (attributes != null)
            attributes.setAttribute(
                    RESOLVED,
                    identity == null ? ANONYMOUS : identity,
                    RequestAttributes.SCOPE_REQUEST);
        return identity;
    }

    /** Clears the cached identity after sign-in or sign-out changes it within a request. */
    public void forget() {
        var attributes = RequestContextHolder.getRequestAttributes();
        if (attributes != null)
            attributes.removeAttribute(RESOLVED, RequestAttributes.SCOPE_REQUEST);
    }

    private Identity resolve() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Identity identity) return identity;
        if (auth != null
                && auth.getPrincipal()
                        instanceof in.arogyamitra.platform.security.CurrentUser user) {
            // CurrentUser.getDisplayName() carries APP_USERS.USERNAME (see SessionService and
            // JwtService), not a free-text display name.
            String username = user.getDisplayName();
            return db
                    .query(
                            "SELECT id,role,subject_id,display_name,credential_version FROM accounts WHERE username=? AND role=? AND active=TRUE AND suspended=FALSE",
                            (r, n) ->
                                    new Identity(
                                            r.getString(1),
                                            r.getString(2),
                                            r.getString(3),
                                            r.getString(4),
                                            r.getInt(5)),
                            username,
                            user.getRole().toLowerCase(java.util.Locale.ROOT))
                    .stream()
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    public Identity current() {
        var identity = optional();
        if (identity == null)
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Please sign in or continue as a patient");
        return identity;
    }

    public Identity require(String role) {
        var identity = current();
        if (!role.equals(identity.role()))
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "This action is not permitted for your role");
        return identity;
    }

    public Identity requireAny(String... roles) {
        var identity = current();
        if (!java.util.List.of(roles).contains(identity.role()))
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "This action is not permitted for your role");
        return identity;
    }

    public void patient(String id) {
        var user = current();
        if (!user.role().equals("admin")
                && !(user.role().equals("patient") && user.subjectId().equals(id)))
            throw forbidden();
    }

    public void provider(String id) {
        var user = current();
        if (!user.role().equals("admin")
                && !(user.role().equals("provider") && user.subjectId().equals(id)))
            throw forbidden();
    }

    public Map<String, Object> actor() {
        var user = current();
        return Map.of("role", user.role(), "id", user.subjectId());
    }

    public ResponseStatusException forbidden() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this record");
    }
}
