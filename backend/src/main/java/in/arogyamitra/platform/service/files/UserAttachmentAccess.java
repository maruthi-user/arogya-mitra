package in.arogyamitra.platform.service.files;

import in.arogyamitra.platform.config.ConditionalOnAppModule;
import in.arogyamitra.platform.security.PermissionService;
import in.arogyamitra.platform.spi.AttachmentAccessChecker;
import in.arogyamitra.platform.spi.UserRef;
import org.springframework.stereotype.Component;

/**
 * Attachments on a user record (ownerType "user", ownerId = user id): the person themself, and
 * anyone with {@code users.manage}. Ready to use for profile documents, and the pattern to copy for
 * your own owner types.
 */
@Component
@ConditionalOnAppModule("files")
public class UserAttachmentAccess implements AttachmentAccessChecker {

    private final PermissionService permissions;

    public UserAttachmentAccess(PermissionService permissions) {
        this.permissions = permissions;
    }

    @Override
    public String ownerType() {
        return "user";
    }

    @Override
    public boolean canAccess(String ownerId, UserRef viewer) {
        return viewer != null
                && (String.valueOf(viewer.getId()).equals(ownerId)
                        || permissions.has(viewer, "users.manage"));
    }
}
