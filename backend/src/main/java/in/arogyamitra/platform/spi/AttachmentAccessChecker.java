package in.arogyamitra.platform.spi;

/**
 * Lets a module decide who may see attachments of the records it owns. The files module asks the
 * checker registered for the attachment's ownerType; with none registered only the uploader and
 * users holding files.manage get access.
 */
public interface AttachmentAccessChecker {

    String ownerType();

    boolean canAccess(String ownerId, UserRef viewer);
}
