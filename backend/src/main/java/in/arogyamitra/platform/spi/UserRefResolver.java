package in.arogyamitra.platform.spi;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Looks people up by id or role. Implemented by the core user service. */
public interface UserRefResolver {

    Optional<UserRef> find(Long id);

    /** Active users holding the given role. */
    List<UserRef> findActiveByRole(String role);

    Map<Long, UserRef> findAll(Collection<Long> ids);

    default String displayName(Long id) {
        return id == null ? null : find(id).map(UserRef::getDisplayName).orElse("User #" + id);
    }
}
