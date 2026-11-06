package in.arogyamitra.platform.security;

import java.util.Optional;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUserContext {

    private CurrentUserContext() {}

    public static Optional<CurrentUser> get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CurrentUser user) {
            return Optional.of(user);
        }
        return Optional.empty();
    }

    public static CurrentUser require() {
        return get().orElseThrow(() -> new AccessDeniedException("Authentication is required"));
    }
}
