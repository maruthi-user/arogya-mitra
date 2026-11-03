package in.arogyamitra.platform.service.audit;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.arogyamitra.platform.config.ConditionalOnAppModule;
import in.arogyamitra.platform.entity.audit.AuditLog;
import in.arogyamitra.platform.repository.audit.AuditLogRepository;
import in.arogyamitra.platform.security.CurrentUserContext;
import in.arogyamitra.platform.spi.AuditEvent;
import in.arogyamitra.platform.spi.UserRef;

import jakarta.persistence.criteria.Predicate;

/**
 * Records {@link AuditEvent}s published by other modules. The listener runs in the publisher's
 * transaction, so a rolled-back change leaves no audit line behind.
 */
@Service
@ConditionalOnAppModule("audit")
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    public record Filter(String entityType, String entityId, Long actorId, String action,
            LocalDateTime from, LocalDateTime to) {
    }

    private final AuditLogRepository repository;
    private final ObjectMapper mapper;

    public AuditLogService(AuditLogRepository repository, ObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @EventListener
    @Transactional
    public void on(AuditEvent event) {
        UserRef actor = CurrentUserContext.get().orElse(null);
        repository.save(new AuditLog(event.entityType(), event.entityId(), event.action(),
                actor == null ? null : actor.getId(),
                actor == null ? "system" : actor.getDisplayName(),
                toJson(event)));
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> search(Filter f, Pageable pageable) {
        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (f.entityType() != null) {
                p.add(cb.equal(root.get("entityType"), f.entityType()));
            }
            if (f.entityId() != null) {
                p.add(cb.equal(root.get("entityId"), f.entityId()));
            }
            if (f.actorId() != null) {
                p.add(cb.equal(root.get("actorId"), f.actorId()));
            }
            if (f.action() != null) {
                p.add(cb.equal(root.get("action"), f.action()));
            }
            if (f.from() != null) {
                p.add(cb.greaterThanOrEqualTo(root.get("createdAt"), f.from()));
            }
            if (f.to() != null) {
                p.add(cb.lessThanOrEqualTo(root.get("createdAt"), f.to()));
            }
            return cb.and(p.toArray(new Predicate[0]));
        };
        return repository.findAll(spec, pageable);
    }

    private String toJson(AuditEvent event) {
        if (event.details() == null || event.details().isEmpty()) {
            return null;
        }
        try {
            return mapper.writeValueAsString(event.details());
        } catch (JsonProcessingException e) {
            log.warn("Could not serialise audit details for {} {}", event.entityType(), event.entityId());
            return null;
        }
    }
}
