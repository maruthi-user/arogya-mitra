package in.arogyamitra.platform.security;

import in.arogyamitra.platform.config.AppConfig;
import in.arogyamitra.platform.spi.UserRef;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Role to permission check, driven by "roles" in app-config.json. A role may list "*" (everything),
 * an exact key ("files.manage") or a prefix wildcard ("files.*"). Used from controllers as
 * {@code @PreAuthorize("@perm.has('files.manage')")}.
 */
@Component("perm")
public class PermissionService {

    private final AppConfig config;

    public PermissionService(AppConfig config) {
        this.config = config;
    }

    public boolean has(String permission) {
        return CurrentUserContext.get().map(user -> has(user, permission)).orElse(false);
    }

    public boolean has(UserRef user, String permission) {
        return user != null && grants(config.permissionsOf(user.getRole()), permission);
    }

    public List<String> permissionsOf(String role) {
        return config.permissionsOf(role);
    }

    static boolean grants(List<String> granted, String required) {
        for (String g : granted) {
            if (g.equals("*") || g.equals(required)) {
                return true;
            }
            if (g.endsWith(".*") && required.startsWith(g.substring(0, g.length() - 1))) {
                return true;
            }
        }
        return false;
    }
}
