package in.arogyamitra.platform.spi;

import java.util.Map;

/**
 * Published by any module through ApplicationEventPublisher. The audit module records it when
 * enabled; when it is disabled nobody listens and the event is simply dropped.
 */
public record AuditEvent(
        String entityType, String entityId, String action, Map<String, Object> details) {

    public static AuditEvent of(String entityType, Object entityId, String action) {
        return new AuditEvent(entityType, String.valueOf(entityId), action, Map.of());
    }

    public static AuditEvent of(
            String entityType, Object entityId, String action, Map<String, Object> details) {
        return new AuditEvent(
                entityType, String.valueOf(entityId), action, details == null ? Map.of() : details);
    }
}
