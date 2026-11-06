package in.arogyamitra.platform.spi;

/**
 * The only view of a person that optional modules (files, audit ...) depend on. Modules store a
 * user id and use this for display; they never import the user entity.
 */
public interface UserRef {

    Long getId();

    String getDisplayName();

    String getEmail();

    /** Role key, as defined under "roles" in app-config.json. */
    String getRole();
}
