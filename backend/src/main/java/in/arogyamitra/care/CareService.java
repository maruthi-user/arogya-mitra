package in.arogyamitra.care;

import static in.arogyamitra.shared.ApiInput.*;

import in.arogyamitra.auth.*;
import in.arogyamitra.notification.NotificationService;
import in.arogyamitra.security.*;
import in.arogyamitra.shared.persistence.CatalogRepository;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** The care service catalog: listing, provider edits, admin approval and availability. */
@Service
public class CareService {
    private final JdbcTemplate db;
    private final CatalogRepository store;
    private final AccessService access;
    private final AccountRepository accounts;
    private final CareSupport support;
    private final in.arogyamitra.reference.ReferenceCatalog reference;
    private final NotificationService notifications;

    /** Keeps the queryable care_services columns in step with the document (V9). */
    @org.springframework.beans.factory.annotation.Autowired
    private in.arogyamitra.shared.persistence.DocumentColumns columns;

    public CareService(
            JdbcTemplate db,
            CatalogRepository store,
            AccessService access,
            AccountRepository accounts,
            CareSupport support,
            in.arogyamitra.reference.ReferenceCatalog reference,
            NotificationService notifications) {
        this.db = db;
        this.store = store;
        this.access = access;
        this.accounts = accounts;
        this.support = support;
        this.reference = reference;
        this.notifications = notifications;
    }

    public List<Map<String, Object>> catalog(
            String village, String kind, String query, boolean managed) {
        Identity u = access.optional();
        if (managed) {
            u = access.current();
            if (!Set.of("admin", "provider").contains(u.role())) throw access.forbidden();
        }
        final Identity actor = u;
        return db
                .query(
                        "SELECT document FROM care_services ORDER BY id",
                        (r, n) -> store.decode(r.getString(1)))
                .stream()
                .filter(
                        s ->
                                managed
                                        ? (actor.role().equals("admin")
                                                || actor.subjectId().equals(s.get("providerId")))
                                        : support.visible(s))
                .filter(s -> village == null || ((List<?>) s.get("coverage")).contains(village))
                .filter(s -> kind == null || kind.equals(s.get("kind")))
                .filter(
                        s ->
                                query == null
                                        || (s.get("title")
                                                        + " "
                                                        + s.get("titleTe")
                                                        + " "
                                                        + s.get("organization")
                                                        + " "
                                                        + s.get("description"))
                                                .toLowerCase(Locale.ROOT)
                                                .contains(query.toLowerCase(Locale.ROOT)))
                .toList();
    }

    @Transactional
    public Map<String, Object> save(String id, Map<String, Object> input) {
        var u = access.current();
        if (!Set.of("provider", "admin").contains(u.role())) throw access.forbidden();
        String provider =
                id == null
                        ? (u.role().equals("provider") ? u.subjectId() : text(input, "providerId"))
                        : (String) support.service(id).get("providerId");
        access.provider(provider);
        var org = store.lockEntity(provider);
        if (db.queryForObject(
                        "SELECT COUNT(*) FROM accounts WHERE subject_id=? AND active=TRUE AND suspended=FALSE",
                        Integer.class,
                        provider)
                == 0) throw support.conflict("Account must be verified and active");
        boolean draft = Boolean.TRUE.equals(input.get("draft"));
        input = new LinkedHashMap<>(input);
        if (draft) {
            input.putIfAbsent("titleTe", input.getOrDefault("title", ""));
            input.putIfAbsent("description", "");
            input.putIfAbsent("capacity", 1);
            input.putIfAbsent("resource", "main");
            input.putIfAbsent("coverage", List.of());
            input.putIfAbsent("slots", List.of());
            input.putIfAbsent("active", true);
            input.putIfAbsent("available", true);
        }
        String business = (String) org.getOrDefault("businessType", "practitioner"),
                kind = text(input, "kind");
        if (!reference.permits(business, kind))
            throw invalid("This service is not available for your business type");
        if (!(input.get("titleTe") instanceof String te) || te.isBlank())
            input.put("titleTe", input.get("title"));
        String title = support.string(input, "title", 100, true),
                titleTe = support.string(input, "titleTe", 100, !draft),
                description =
                        support.string(
                                input,
                                "description",
                                500,
                                !draft && input.containsKey("practitionerId"));
        boolean feeOnRequest = input.get("fee") == null;
        int fee = feeOnRequest ? 0 : support.number(input, "fee", 0, 100000),
                capacity = support.number(input, "capacity", 1, 20);
        int duration =
                input.containsKey("durationMinutes")
                        ? support.number(input, "durationMinutes", 15, 480)
                        : 30;
        Map<String, Object> timeWindow = null;
        if (input.get("timeWindow") != null) {
            if (!(input.get("timeWindow") instanceof Map<?, ?> window))
                throw invalid("Invalid time window");
            Object startValue = window.get("start"), endValue = window.get("end");
            if (!(startValue instanceof String start)
                    || !(endValue instanceof String end)
                    || start.length() > 5
                    || end.length() > 5) throw invalid("Invalid time window");
            timeWindow = Map.of("start", start, "end", end);
            List<String> generated = new ArrayList<>();
            if (!start.isEmpty() || !end.isEmpty() || !draft) {
                if (!start.matches("([01]\\d|2[0-3]):[0-5]\\d")
                        || !end.matches("([01]\\d|2[0-3]):[0-5]\\d"))
                    throw invalid("Choose valid start and end times");
                int first = LocalTime.parse(start).toSecondOfDay() / 60,
                        last = LocalTime.parse(end).toSecondOfDay() / 60;
                if (first >= last || first + duration > last)
                    throw invalid("Time window must fit at least one full service duration");
                for (int minute = first; minute + duration <= last; minute += duration)
                    generated.add(
                            String.format(Locale.ROOT, "%02d:%02d", minute / 60, minute % 60));
            }
            input.put("slots", generated);
        }
        if (!(input.get("coverage") instanceof List<?> coverage)
                || (!draft && coverage.isEmpty())
                || coverage.size() > 5
                || !reference.ids("villages").containsAll(coverage))
            throw invalid("Select valid coverage locations");
        if (!(input.get("slots") instanceof List<?> slots)
                || (!draft && slots.isEmpty())
                || slots.size() > 48
                || new HashSet<>(slots).size() != slots.size()
                || slots.stream()
                        .anyMatch(
                                t ->
                                        !(t instanceof String v)
                                                || !v.matches("([01]\\d|2[0-3]):[0-5]\\d")))
            throw invalid("Enter unique HH:mm slots (maximum 48)");
        if (slots.stream()
                .anyMatch(
                        t -> LocalTime.parse(t.toString()).toSecondOfDay() / 60 + duration > 1440))
            throw invalid("Slots must finish before midnight");
        String
                practitionerId =
                        input.containsKey("practitionerId")
                                ? support.string(input, "practitionerId", 80, false)
                                : "",
                practitionerName = "";
        if (!practitionerId.isEmpty()) {
            var assigned =
                    db.query(
                            "SELECT display_name FROM accounts WHERE id=? AND subject_id=? AND role='provider' AND active=TRUE AND suspended=FALSE",
                            (r, n) -> r.getString(1),
                            practitionerId,
                            provider);
            if (assigned.isEmpty())
                throw invalid("Choose an active practitioner belonging to this business");
            practitionerName = assigned.get(0);
            input.put("resource", "practitioner:" + practitionerId);
        } else if (!draft
                && input.containsKey("practitionerId")
                && Set.of("home_visit", "checkup", "op").contains(kind))
            throw invalid("Select a practitioner from your business");
        String resource = support.string(input, "resource", 100, true);
        boolean active = bool(input, "active");
        int travelFee =
                input.containsKey("travelFee") ? support.number(input, "travelFee", 0, 100000) : 0;
        String deliveryMode =
                input.containsKey("deliveryMode")
                        ? support.string(input, "deliveryMode", 30, true)
                        : switch (kind) {
                            case "home_visit", "checkup", "delivery" -> "home";
                            case "ambulance" -> "transport";
                            default -> "onsite";
                        };
        if (!Set.of("home", "onsite", "remote", "transport").contains(deliveryMode))
            throw invalid("Invalid delivery mode");
        Object days = input.getOrDefault("availableDays", List.of(1, 2, 3, 4, 5, 6, 7));
        if (!(days instanceof List<?> dayList)
                || (!draft && dayList.isEmpty())
                || dayList.size() > 7
                || new HashSet<>(dayList).size() != dayList.size()
                || dayList.stream()
                        .anyMatch(
                                d ->
                                        !(d instanceof Number n)
                                                || n.doubleValue() != n.intValue()
                                                || n.intValue() < 1
                                                || n.intValue() > 7))
            throw invalid("Choose valid available days");
        // One resource represents a team, vehicle, counter or room. All its services share
        // capacity.
        for (var sibling : catalog(null, null, null, true))
            if (provider.equals(sibling.get("providerId"))
                    && !Objects.equals(id, sibling.get("id"))
                    && resource.equals(sibling.get("resource"))
                    && capacity != ((Number) sibling.get("capacity")).intValue())
                throw invalid("Services sharing a resource must use the same capacity");
        if (id != null) {
            support.expire(provider);
            int occupied =
                    db.queryForObject(
                            "SELECT COUNT(*) FROM care_requests WHERE service_id=? AND status IN ('pending','accepted','in_progress')",
                            Integer.class,
                            id);
            if (occupied > 0)
                throw support.conflict(
                        "Finish or cancel open requests before editing this service");
        }
        var s = new LinkedHashMap<String, Object>();
        s.put("id", id == null ? UUID.randomUUID().toString() : id);
        s.put("providerId", provider);
        s.put("kind", kind);
        s.put("title", title);
        s.put("titleTe", titleTe);
        s.put("description", description);
        s.put("fee", fee);
        s.put("feeOnRequest", feeOnRequest);
        s.put("totalFee", fee + travelFee);
        s.put("capacity", capacity);
        s.put("durationMinutes", duration);
        s.put("timeWindow", timeWindow);
        s.put("practitionerId", practitionerId);
        s.put("practitionerName", practitionerName);
        s.put("resource", resource);
        s.put("coverage", coverage);
        s.put("slots", slots);
        s.put("active", active);
        s.put("available", bool(input, "available"));
        s.put("approval", draft ? "draft" : "pending");
        s.put(
                "serviceNotes",
                input.containsKey("serviceNotes")
                        ? support.string(input, "serviceNotes", 300, false)
                        : "");
        s.put("travelFee", travelFee);
        s.put("deliveryMode", deliveryMode);
        s.put("availableDays", days);
        s.put("organization", org.get("organization"));
        s.put("businessType", business);
        s.put("phone", org.get("phone"));
        s.put("updatedAt", System.currentTimeMillis());
        if (id == null)
            db.update(
                    "INSERT INTO care_services(id,provider_id,approval,active,document) VALUES(?,?,?,?,?)",
                    s.get("id"),
                    provider,
                    s.get("approval"),
                    active,
                    store.encode(s));
        else
            db.update(
                    "UPDATE care_services SET approval=?,active=?,document=? WHERE id=?",
                    s.get("approval"),
                    active,
                    store.encode(s),
                    id);
        columns.syncService(s);
        support.audit(
                u, draft ? "service.draft" : "service.submitted", (String) s.get("id"), title);
        return s;
    }

    @Transactional
    public Map<String, Object> review(String id, Map<String, Object> body) {
        var u = access.require("admin");
        var existing = support.service(id);
        store.lockEntity((String) existing.get("providerId"));
        var s = support.service(id);
        if (!"pending".equals(s.get("approval")))
            throw support.conflict("Only pending services can be reviewed");
        String decision = text(body, "decision"),
                reason = support.string(body, "reason", 1000, true);
        if (!Set.of("approved", "rejected").contains(decision) || reason.length() < 5)
            throw invalid("Choose a decision and give a reason (5-1000 characters)");
        s.put("approval", decision);
        s.put("reviewReason", reason);
        db.update(
                "UPDATE care_services SET approval=?,document=? WHERE id=?",
                decision,
                store.encode(s),
                id);
        columns.syncService(s);
        support.audit(u, "service." + decision, id, reason);
        accounts.providerEmail((String) s.get("providerId"))
                .ifPresent(
                        email ->
                                notifications.queue(
                                        email,
                                        "Arogya Mitra service review",
                                        s.get("title") + ": " + decision + "\n" + reason));
        return s;
    }

    @Transactional
    public Map<String, Object> availabilityState(String id, Map<String, Object> body) {
        var u = access.current();
        var original = support.service(id);
        String provider = (String) original.get("providerId");
        access.provider(provider);
        store.lockEntity(provider);
        var s = support.service(id);
        s.put("available", bool(body, "available"));
        s.put("active", bool(body, "active"));
        db.update(
                "UPDATE care_services SET active=?,document=? WHERE id=?",
                s.get("active"),
                store.encode(s),
                id);
        columns.syncService(s);
        support.audit(
                u,
                "service.availability",
                id,
                "available=" + s.get("available") + ", active=" + s.get("active"));
        return s;
    }

    public Map<String, Object> availability(String id, String day) {
        var s = support.service(id);
        if (!support.visible(s))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Service unavailable");
        support.date(day);
        boolean scheduled =
                ((List<?>) s.getOrDefault("availableDays", List.of(1, 2, 3, 4, 5, 6, 7)))
                        .contains(LocalDate.parse(day).getDayOfWeek().getValue());
        List<Map<String, Object>> slots = new ArrayList<>();
        for (Object t : (List<?>) s.get("slots")) {
            boolean future =
                    LocalDateTime.parse(day + "T" + t)
                            .isAfter(LocalDateTime.now(ZoneId.of("Asia/Kolkata")));
            slots.add(
                    Map.of(
                            "time",
                            t,
                            "remaining",
                            scheduled && future && Boolean.TRUE.equals(s.get("available"))
                                    ? Math.max(
                                            0,
                                            ((Number) s.get("capacity")).intValue()
                                                    - support.used(s, day, t.toString()))
                                    : 0));
        }
        return Map.of("slots", slots);
    }
}
