package in.arogyamitra.platform.security;

import in.arogyamitra.platform.spi.UserRef;
import java.io.Serializable;
import org.springframework.security.core.AuthenticatedPrincipal;

/**
 * The logged-in person. Built on every request from the JWT plus one lookup of its session row, so
 * the role and status are the current ones from the database. sessionId is null when a test or job
 * acts as a user directly.
 */
public final class CurrentUser implements UserRef, AuthenticatedPrincipal, Serializable {

    private final Long id;
    private final String email;
    private final String displayName;
    private final String role;
    private final String sessionId;

    public CurrentUser(Long id, String email, String displayName, String role) {
        this(id, email, displayName, role, null);
    }

    public CurrentUser(Long id, String email, String displayName, String role, String sessionId) {
        this.id = id;
        this.email = email;
        this.displayName = displayName;
        this.role = role;
        this.sessionId = sessionId;
    }

    @Override
    public Long getId() {
        return id;
    }

    @Override
    public String getEmail() {
        return email;
    }

    @Override
    public String getDisplayName() {
        return displayName;
    }

    @Override
    public String getRole() {
        return role;
    }

    /** The USER_SESSIONS id this request was authenticated with. */
    public String getSessionId() {
        return sessionId;
    }

    @Override
    public String getName() {
        return email;
    }
}
