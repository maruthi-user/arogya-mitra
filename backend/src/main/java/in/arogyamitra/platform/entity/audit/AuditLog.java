package in.arogyamitra.platform.entity.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import org.hibernate.annotations.CreationTimestamp;

/**
 * One immutable line: who did what to which record. Entity-agnostic, so any module can write to it.
 */
@Entity
@Table(
        name = "AUDIT_LOGS",
        indexes = {
            @Index(name = "IDX_AUDIT_ENTITY", columnList = "ENTITY_TYPE, ENTITY_ID"),
            @Index(name = "IDX_AUDIT_ACTOR", columnList = "ACTOR_ID"),
            @Index(name = "IDX_AUDIT_CREATED", columnList = "CREATED_AT")
        })
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ENTITY_TYPE", nullable = false, length = 80)
    private String entityType;

    @Column(name = "ENTITY_ID", nullable = false, length = 80)
    private String entityId;

    @Column(name = "ACTION", nullable = false, length = 60)
    private String action;

    @Column(name = "ACTOR_ID")
    private Long actorId;

    @Column(name = "ACTOR_NAME", length = 150)
    private String actorName;

    /** JSON text. */
    @Column(name = "DETAILS", columnDefinition = "TEXT")
    private String details;

    @CreationTimestamp
    @Column(name = "CREATED_AT", updatable = false)
    private LocalDateTime createdAt;

    protected AuditLog() {}

    public AuditLog(
            String entityType,
            String entityId,
            String action,
            Long actorId,
            String actorName,
            String details) {
        this.entityType = entityType;
        this.entityId = entityId;
        this.action = action;
        this.actorId = actorId;
        this.actorName = actorName;
        this.details = details;
    }

    public Long getId() {
        return id;
    }

    public String getEntityType() {
        return entityType;
    }

    public String getEntityId() {
        return entityId;
    }

    public String getAction() {
        return action;
    }

    public Long getActorId() {
        return actorId;
    }

    public String getActorName() {
        return actorName;
    }

    public String getDetails() {
        return details;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
