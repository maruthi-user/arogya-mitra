package in.arogyamitra.platform.entity.files;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/** A stored file attached to any record, identified by (ownerType, ownerId). */
@Entity
@Table(name = "FILE_ATTACHMENTS", indexes = @Index(name = "IDX_ATTACH_OWNER", columnList = "OWNER_TYPE, OWNER_ID"))
public class FileAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "OWNER_TYPE", nullable = false, length = 60)
    private String ownerType;

    @Column(name = "OWNER_ID", nullable = false, length = 60)
    private String ownerId;

    @Column(name = "FILE_NAME", nullable = false, length = 255)
    private String fileName;

    @Column(name = "CONTENT_TYPE", length = 150)
    private String contentType;

    @Column(name = "SIZE_BYTES", nullable = false)
    private long sizeBytes;

    @Column(name = "STORAGE_KEY", nullable = false, length = 300)
    private String storageKey;

    @Column(name = "UPLOADED_BY")
    private Long uploadedBy;

    @CreationTimestamp
    @Column(name = "CREATED_AT", updatable = false)
    private LocalDateTime createdAt;

    protected FileAttachment() {
    }

    public FileAttachment(String ownerType, String ownerId, String fileName, String contentType, long sizeBytes,
            String storageKey, Long uploadedBy) {
        this.ownerType = ownerType;
        this.ownerId = ownerId;
        this.fileName = fileName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.storageKey = storageKey;
        this.uploadedBy = uploadedBy;
    }

    public Long getId() {
        return id;
    }

    public String getOwnerType() {
        return ownerType;
    }

    public String getOwnerId() {
        return ownerId;
    }

    public String getFileName() {
        return fileName;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public Long getUploadedBy() {
        return uploadedBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
