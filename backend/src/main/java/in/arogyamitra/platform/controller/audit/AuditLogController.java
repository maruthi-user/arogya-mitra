package in.arogyamitra.platform.controller.audit;

import in.arogyamitra.platform.config.ConditionalOnAppModule;
import in.arogyamitra.platform.entity.audit.AuditLog;
import in.arogyamitra.platform.service.audit.AuditLogService;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit")
@ConditionalOnAppModule("audit")
public class AuditLogController {

    public record AuditLogDto(
            Long id,
            String entityType,
            String entityId,
            String action,
            Long actorId,
            String actorName,
            String details,
            LocalDateTime createdAt) {
        static AuditLogDto from(AuditLog a) {
            return new AuditLogDto(
                    a.getId(),
                    a.getEntityType(),
                    a.getEntityId(),
                    a.getAction(),
                    a.getActorId(),
                    a.getActorName(),
                    a.getDetails(),
                    a.getCreatedAt());
        }
    }

    private final AuditLogService audit;

    public AuditLogController(AuditLogService audit) {
        this.audit = audit;
    }

    @GetMapping
    @PreAuthorize("@perm.has('audit.view')")
    public Page<AuditLogDto> search(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        PageRequest pageable =
                PageRequest.of(
                        Math.max(page, 0),
                        Math.min(Math.max(size, 1), 200),
                        Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        return audit.search(
                        new AuditLogService.Filter(entityType, entityId, actorId, action, from, to),
                        pageable)
                .map(AuditLogDto::from);
    }
}
