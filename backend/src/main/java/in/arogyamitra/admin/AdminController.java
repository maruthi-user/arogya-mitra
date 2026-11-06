package in.arogyamitra.admin;

import static in.arogyamitra.shared.ApiInput.*;

import in.arogyamitra.notification.NotificationService;
import in.arogyamitra.registration.ProviderApplicationService;
import in.arogyamitra.registration.VerifierService;
import in.arogyamitra.registration.dto.OnboardingRequests.*;
import in.arogyamitra.security.AccessService;
import in.arogyamitra.shared.persistence.CatalogRepository;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final in.arogyamitra.reference.ReferenceCatalog reference;
    private final AccessService access;
    private final ProviderApplicationService applications;
    private final VerifierService verifiers;
    private final NotificationService notifications;
    private final JdbcTemplate db;
    private final CatalogRepository store;

    public AdminController(
            AccessService access,
            ProviderApplicationService applications,
            VerifierService verifiers,
            NotificationService notifications,
            JdbcTemplate db,
            CatalogRepository store,
            in.arogyamitra.reference.ReferenceCatalog reference) {
        this.reference = reference;
        this.access = access;
        this.applications = applications;
        this.verifiers = verifiers;
        this.notifications = notifications;
        this.db = db;
        this.store = store;
    }

    @GetMapping("/applications")
    public List<Map<String, Object>> applications() {
        access.require("admin");
        return applications.list();
    }

    /** Final decision (step 2). Only applications a verifier forwarded can be decided here. */
    @PostMapping("/applications/{id}/review")
    public Map<String, Object> review(
            @PathVariable String id, @Valid @RequestBody ReviewRequest body) {
        var admin = access.require("admin");
        return applications.review(id, body.decision(), body.reason(), admin.accountId());
    }

    @GetMapping("/applications/{id}/history")
    public List<Map<String, Object>> history(@PathVariable String id) {
        access.require("admin");
        return applications.history(id);
    }

    @PostMapping("/applications/{id}/resend-activation")
    public Map<String, Object> resendActivation(@PathVariable String id) {
        var admin = access.require("admin");
        return applications.resendActivation(id, admin.accountId());
    }

    @GetMapping("/verifiers")
    public List<Map<String, Object>> verifiers() {
        access.require("admin");
        return verifiers.list();
    }

    @PostMapping("/verifiers")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createVerifier(@Valid @RequestBody CreateVerifierRequest body) {
        var admin = access.require("admin");
        return verifiers.create(body.name(), body.email(), admin.accountId());
    }

    @PatchMapping("/verifiers/{id}")
    public Map<String, Object> updateVerifier(
            @PathVariable String id, @Valid @RequestBody UpdateVerifierRequest body) {
        var admin = access.require("admin");
        return verifiers.setSuspended(id, body.suspended(), admin.accountId());
    }

    @GetMapping("/notifications")
    public List<Map<String, Object>> notifications() {
        access.require("admin");
        return notifications.list();
    }

    @PostMapping("/notifications/{id}/retry")
    public Map<String, Boolean> retry(@PathVariable String id) {
        access.require("admin");
        notifications.retry(id);
        return Map.of("ok", true);
    }

    @GetMapping("/audit")
    public List<Map<String, Object>> audit() {
        access.require("admin");
        List<Map<String, Object>> events =
                new ArrayList<>(
                        db.query(
                                "SELECT actor_id,action,resource_id,detail,created_at FROM audit_events ORDER BY created_at DESC LIMIT 200",
                                (r, n) ->
                                        Map.of(
                                                "actorId",
                                                r.getString(1),
                                                "action",
                                                r.getString(2),
                                                "resourceId",
                                                r.getString(3),
                                                "detail",
                                                r.getString(4),
                                                "createdAt",
                                                r.getLong(5))));
        events.addAll(
                db.query(
                        "SELECT actor_name,action,entity_id,details,created_at FROM AUDIT_LOGS ORDER BY created_at DESC LIMIT 200",
                        (r, n) ->
                                Map.of(
                                        "actorId",
                                        Objects.toString(r.getString(1), "system"),
                                        "action",
                                        "security." + r.getString(2),
                                        "resourceId",
                                        Objects.toString(r.getString(3), ""),
                                        "detail",
                                        Objects.toString(r.getString(4), ""),
                                        "createdAt",
                                        r.getTimestamp(5) == null
                                                ? 0L
                                                : r.getTimestamp(5).getTime())));
        return events.stream()
                .sorted(
                        (a, b) ->
                                Long.compare(
                                        ((Number) b.get("createdAt")).longValue(),
                                        ((Number) a.get("createdAt")).longValue()))
                .limit(200)
                .toList();
    }

    @GetMapping("/pharmacies")
    public List<Map<String, Object>> pharmacies() {
        access.require("admin");
        return store.entities("pharmacies");
    }

    @PostMapping("/pharmacies")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createPharmacy(@RequestBody Map<String, Object> body) {
        access.require("admin");
        String name = text(body, "name"),
                phone = text(body, "phone"),
                village = text(body, "village");
        if (!phone.matches("(?:\\+91)?[6-9]\\d{9}") || !reference.contains("villages", village))
            throw invalid("Invalid pharmacy details");
        String id = "s-" + UUID.randomUUID();
        var stock = new LinkedHashMap<String, Object>();
        for (String med : reference.ids("medicines")) stock.put(med, false);
        var profile = new LinkedHashMap<String, Object>();
        profile.put("id", id);
        profile.put("name", name);
        profile.put("phone", phone);
        profile.put("village", village);
        profile.put("open", true);
        profile.put("delivery", false);
        profile.put("stock", stock);
        store.create(id, "pharmacies", profile);
        return profile;
    }
}
