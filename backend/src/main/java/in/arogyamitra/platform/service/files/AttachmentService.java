package in.arogyamitra.platform.service.files;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import in.arogyamitra.platform.config.ConditionalOnAppModule;
import in.arogyamitra.platform.entity.files.FileAttachment;
import in.arogyamitra.platform.exception.BadRequestException;
import in.arogyamitra.platform.exception.ResourceNotFoundException;
import in.arogyamitra.platform.repository.files.FileAttachmentRepository;
import in.arogyamitra.platform.security.CurrentUser;
import in.arogyamitra.platform.security.CurrentUserContext;
import in.arogyamitra.platform.security.PermissionService;
import in.arogyamitra.platform.spi.AttachmentAccessChecker;
import in.arogyamitra.platform.spi.AuditEvent;

@Service
@ConditionalOnAppModule("files")
public class AttachmentService {

    private static final Pattern OWNER_TYPE = Pattern.compile("[A-Za-z][A-Za-z0-9_-]{0,59}");
    private static final Pattern OWNER_ID = Pattern.compile("[A-Za-z0-9_-]{1,60}");
    private static final Pattern EXTENSION = Pattern.compile("\\.[A-Za-z0-9]{1,10}$");

    public record Download(FileAttachment attachment, InputStream content) {
    }

    private final FileAttachmentRepository repository;
    private final FileStorage storage;
    private final PermissionService permissions;
    private final ApplicationEventPublisher events;
    private final Map<String, AttachmentAccessChecker> checkers = new HashMap<>();
    private final long maxSize;
    private final Set<String> allowedTypes;

    public AttachmentService(FileAttachmentRepository repository, FileStorage storage, PermissionService permissions,
            ApplicationEventPublisher events, List<AttachmentAccessChecker> checkerBeans,
            @Value("${app.files.max-size-bytes:15728640}") long maxSize,
            @Value("${app.files.allowed-content-types:application/pdf,image/png,image/jpeg,text/plain}")
            List<String> allowedTypes) {
        this.repository = repository;
        this.storage = storage;
        this.permissions = permissions;
        this.events = events;
        checkerBeans.forEach(c -> checkers.put(c.ownerType(), c));
        this.maxSize = maxSize;
        this.allowedTypes = allowedTypes.stream().map(String::trim).collect(Collectors.toSet());
    }

    @Transactional
    public FileAttachment upload(String ownerType, String ownerId, MultipartFile file) {
        validateOwner(ownerType, ownerId);
        CurrentUser user = CurrentUserContext.require();
        requireOwnerAccess(ownerType, ownerId, user);

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty.");
        }
        if (file.getSize() > maxSize) {
            throw new BadRequestException("File is larger than " + (maxSize / (1024 * 1024)) + " MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !allowedTypes.contains(contentType)) {
            throw new BadRequestException("File type '" + contentType + "' is not allowed.");
        }

        String originalName = cleanFileName(file.getOriginalFilename());
        String key = ownerType + "/" + ownerId + "/" + UUID.randomUUID() + extensionOf(originalName);
        try (InputStream in = file.getInputStream()) {
            storage.store(key, in, file.getSize(), contentType);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not store the file.", e);
        }
        FileAttachment saved = repository.save(
                new FileAttachment(ownerType, ownerId, originalName, contentType, file.getSize(), key, user.getId()));
        events.publishEvent(AuditEvent.of("Attachment", saved.getId(), "UPLOADED",
                Map.of("ownerType", ownerType, "ownerId", ownerId, "fileName", originalName)));
        return saved;
    }

    @Transactional(readOnly = true)
    public List<FileAttachment> list(String ownerType, String ownerId) {
        validateOwner(ownerType, ownerId);
        requireOwnerAccess(ownerType, ownerId, CurrentUserContext.require());
        return repository.findByOwnerTypeAndOwnerIdOrderByCreatedAtAsc(ownerType, ownerId);
    }

    @Transactional(readOnly = true)
    public Download download(Long id) {
        FileAttachment attachment = require(id);
        requireAttachmentAccess(attachment, CurrentUserContext.require());
        try {
            return new Download(attachment, storage.open(attachment.getStorageKey()));
        } catch (IOException e) {
            throw new ResourceNotFoundException("The stored file is no longer available.");
        }
    }

    @Transactional
    public void delete(Long id) {
        FileAttachment attachment = require(id);
        CurrentUser user = CurrentUserContext.require();
        boolean uploader = user.getId().equals(attachment.getUploadedBy());
        if (!uploader && !permissions.has(user, "files.manage")) {
            throw new AccessDeniedException("Only the uploader or a file manager can delete this file.");
        }
        repository.delete(attachment);
        try {
            storage.delete(attachment.getStorageKey());
        } catch (IOException e) {
            throw new UncheckedIOException("Could not delete the stored file.", e);
        }
        events.publishEvent(AuditEvent.of("Attachment", id, "DELETED",
                Map.of("ownerType", attachment.getOwnerType(), "ownerId", attachment.getOwnerId())));
    }

    // ------------------------------------------------------------------ access

    private void requireOwnerAccess(String ownerType, String ownerId, CurrentUser user) {
        AttachmentAccessChecker checker = checkers.get(ownerType);
        boolean allowed = permissions.has(user, "files.manage")
                || (checker != null && checker.canAccess(ownerId, user));
        if (!allowed) {
            throw new AccessDeniedException("You cannot access files of this record.");
        }
    }

    private void requireAttachmentAccess(FileAttachment attachment, CurrentUser user) {
        if (user.getId().equals(attachment.getUploadedBy())) {
            return;
        }
        requireOwnerAccess(attachment.getOwnerType(), attachment.getOwnerId(), user);
    }

    private FileAttachment require(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment " + id + " not found."));
    }

    private static void validateOwner(String ownerType, String ownerId) {
        if (ownerType == null || !OWNER_TYPE.matcher(ownerType).matches()) {
            throw new BadRequestException("Invalid ownerType.");
        }
        if (ownerId == null || !OWNER_ID.matcher(ownerId).matches()) {
            throw new BadRequestException("Invalid ownerId.");
        }
    }

    private static String cleanFileName(String name) {
        if (name == null || name.isBlank()) {
            return "file";
        }
        String base = name.replace('\\', '/');
        base = base.substring(base.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "").trim();
        if (base.isEmpty()) {
            return "file";
        }
        return base.length() > 200 ? base.substring(base.length() - 200) : base;
    }

    private static String extensionOf(String fileName) {
        var m = EXTENSION.matcher(fileName);
        return m.find() ? m.group().toLowerCase() : "";
    }
}
