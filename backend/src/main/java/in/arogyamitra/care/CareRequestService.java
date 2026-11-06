package in.arogyamitra.care;

import static in.arogyamitra.shared.ApiInput.*;

import in.arogyamitra.auth.*;
import in.arogyamitra.notification.NotificationService;
import in.arogyamitra.patient.PatientService;
import in.arogyamitra.security.*;
import in.arogyamitra.shared.persistence.CatalogRepository;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Patient requests for care services and their status changes. */
@Service
public class CareRequestService {
    private final in.arogyamitra.reference.ReferenceCatalog reference;
    private final JdbcTemplate db;
    private final CatalogRepository store;
    private final AccessService access;
    private final AccountRepository accounts;
    private final PatientService patients;
    private final NotificationService notifications;
    private final CareSupport support;

    public CareRequestService(
            JdbcTemplate db,
            CatalogRepository store,
            AccessService access,
            AccountRepository accounts,
            PatientService patients,
            NotificationService notifications,
            in.arogyamitra.reference.ReferenceCatalog reference,
            CareSupport support) {
        this.reference = reference;
        this.db = db;
        this.store = store;
        this.access = access;
        this.accounts = accounts;
        this.patients = patients;
        this.notifications = notifications;
        this.support = support;
    }

    @Transactional
    public Map<String, Object> request(Map<String, Object> input) {
        var u = access.require("patient");
        var initial = support.service(text(input, "serviceId"));
        store.lockEntity((String) initial.get("providerId"));
        var s = support.service((String) initial.get("id"));
        if (!support.visible(s) || !Boolean.TRUE.equals(s.get("available")))
            throw support.conflict("Service is unavailable");
        var patient = patients.get(u.subjectId());
        if ("Guest".equals(patient.get("name"))
                || patient.getOrDefault("phone", "").toString().isBlank())
            throw invalid("Save your name and phone in Profile before requesting care");
        String day = text(input, "date"),
                time = text(input, "time"),
                enteredVillage = text(input, "village").trim(),
                mode = text(input, "mode");
        support.date(day);
        String village =
                reference.items("villages").stream()
                        .filter(
                                v ->
                                        List.of("id", "en", "te").stream()
                                                .anyMatch(
                                                        k ->
                                                                enteredVillage.equalsIgnoreCase(
                                                                        Objects.toString(
                                                                                v.get(k), ""))))
                        .map(v -> v.get("id").toString())
                        .findFirst()
                        .orElse(enteredVillage);
        if (!((List<?>) s.get("coverage")).contains(village))
            throw invalid(
                    "This provider does not serve the entered village. Check the service coverage.");
        if (!Set.of("visit", "callback").contains(mode)
                || !((List<?>) s.get("coverage")).contains(village)
                || !((List<?>) s.get("slots")).contains(time)
                || !LocalDateTime.parse(day + "T" + time)
                        .isAfter(LocalDateTime.now(ZoneId.of("Asia/Kolkata"))))
            throw invalid("Invalid location, mode or slot");
        if (!((List<?>) s.getOrDefault("availableDays", List.of(1, 2, 3, 4, 5, 6, 7)))
                .contains(LocalDate.parse(day).getDayOfWeek().getValue()))
            throw invalid("Service is not scheduled on this day");
        String address = support.string(input, "address", 300, false),
                details = support.string(input, "details", 500, false);
        String payment =
                input.containsKey("paymentPreference")
                        ? support.string(input, "paymentPreference", 30, false)
                        : "";
        if (!Set.of("", "undecided", "cash", "online").contains(payment))
            throw invalid("Invalid payment preference");
        Double latitude = null, longitude = null;
        if (input.get("latitude") != null || input.get("longitude") != null) {
            if (!(input.get("latitude") instanceof Number lat)
                    || !(input.get("longitude") instanceof Number lon))
                throw invalid("Invalid current location");
            latitude = lat.doubleValue();
            longitude = lon.doubleValue();
            if (!Double.isFinite(latitude)
                    || !Double.isFinite(longitude)
                    || Math.abs(latitude) > 90
                    || Math.abs(longitude) > 180) throw invalid("Invalid current location");
        }
        if (Set.of("home_visit", "delivery", "checkup", "ambulance").contains(s.get("kind"))
                && address.length() < 5) throw invalid("Enter a pickup or home address");
        if (Set.of("medicine", "delivery", "lab", "ambulance").contains(s.get("kind"))
                && details.length() < 3)
            throw invalid(
                    "Enter medicine, test or ambulance destination details for provider review");
        support.expire((String) s.get("providerId"));
        int duplicate =
                db.queryForObject(
                        "SELECT COUNT(*) FROM care_requests WHERE patient_id=? AND service_id=? AND request_date=? AND request_time=? AND status IN ('pending','accepted','in_progress')",
                        Integer.class,
                        u.subjectId(),
                        s.get("id"),
                        day,
                        time);
        if (duplicate > 0) throw support.conflict("You already have an open request for this slot");
        if (support.used(s, day, time) >= ((Number) s.get("capacity")).intValue())
            throw support.conflict("This slot is full. Choose another time");
        var r = new LinkedHashMap<String, Object>();
        String id = UUID.randomUUID().toString();
        long now = System.currentTimeMillis(),
                start =
                        LocalDateTime.parse(day + "T" + time)
                                .atZone(ZoneId.of("Asia/Kolkata"))
                                .toInstant()
                                .toEpochMilli();
        r.put("id", id);
        r.put("serviceId", s.get("id"));
        r.put("providerId", s.get("providerId"));
        r.put("patientId", u.subjectId());
        r.put("patientName", patient.get("name"));
        r.put("phone", patient.get("phone"));
        r.put("kind", s.get("kind"));
        r.put("title", s.get("title"));
        r.put("titleTe", s.get("titleTe"));
        r.put("organization", s.get("organization"));
        r.put("resource", s.get("resource"));
        r.put("practitionerId", s.getOrDefault("practitionerId", ""));
        r.put("practitionerName", s.getOrDefault("practitionerName", ""));
        r.put("durationMinutes", s.getOrDefault("durationMinutes", 30));
        r.put(
                "fee",
                ((Number) s.get("fee")).intValue()
                        + ((Number) s.getOrDefault("travelFee", 0)).intValue());
        r.put("travelFee", s.getOrDefault("travelFee", 0));
        r.put("deliveryMode", s.getOrDefault("deliveryMode", "onsite"));
        r.put("feeOnRequest", s.getOrDefault("feeOnRequest", false));
        r.put("date", day);
        r.put("time", time);
        r.put("village", village);
        r.put("mode", mode);
        r.put("address", address);
        r.put("details", details);
        r.put("status", "pending");
        r.put("createdAt", now);
        r.put("expiresAt", Math.min(now + 1800000, start));
        r.put("history", new ArrayList<>());
        support.history(r, "pending", u.subjectId(), "");
        r.put("paymentPreference", payment);
        r.put("paymentStatus", "not_collected");
        if (latitude != null) {
            r.put("latitude", latitude);
            r.put("longitude", longitude);
        }
        db.update(
                "INSERT INTO care_requests(id,service_id,provider_id,patient_id,request_date,request_time,status,expires_at,created_at,document) VALUES(?,?,?,?,?,?,'pending',?,?,?)",
                id,
                s.get("id"),
                s.get("providerId"),
                u.subjectId(),
                day,
                time,
                r.get("expiresAt"),
                now,
                store.encode(r));
        accounts.providerEmail((String) s.get("providerId"))
                .ifPresent(
                        email ->
                                notifications.queue(
                                        email,
                                        "Arogya Mitra service request",
                                        s.get("title")
                                                + " requested for "
                                                + day
                                                + " "
                                                + time
                                                + " (Asia/Kolkata). Sign in to review. Not confirmed until you accept. Pending requests expire within 30 minutes."));
        return r;
    }

    public List<Map<String, Object>> requests() {
        var u = access.current();
        support.expire();
        return db.query(
                "SELECT document FROM care_requests WHERE (?='admin' OR (?='provider' AND provider_id=?) OR (?='patient' AND patient_id=?)) ORDER BY created_at DESC",
                (r, n) -> store.decode(r.getString(1)),
                u.role(),
                u.role(),
                u.subjectId(),
                u.role(),
                u.subjectId());
    }

    @Transactional
    public Map<String, Object> transition(String id, Map<String, Object> body) {
        var u = access.current();
        var rows =
                db.query(
                        "SELECT document FROM care_requests WHERE id=?",
                        (r, n) -> store.decode(r.getString(1)),
                        id);
        if (rows.isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found");
        var r = rows.get(0);
        boolean provider = u.role().equals("provider") && u.subjectId().equals(r.get("providerId")),
                patient = u.role().equals("patient") && u.subjectId().equals(r.get("patientId"));
        if (!provider && !patient && !u.role().equals("admin")) throw access.forbidden();
        store.lockEntity((String) r.get("providerId"));
        support.expire((String) r.get("providerId"));
        r =
                db.query(
                                "SELECT document FROM care_requests WHERE id=? FOR UPDATE",
                                (rs, n) -> store.decode(rs.getString(1)),
                                id)
                        .get(0);
        String next = text(body, "status"),
                current = (String) r.get("status"),
                note = support.string(body, "note", 500, false);
        boolean allowed =
                provider
                        && ((current.equals("pending")
                                        && Set.of("accepted", "rejected").contains(next))
                                || (current.equals("accepted")
                                        && Set.of("in_progress", "cancelled").contains(next))
                                || (current.equals("in_progress")
                                        && Set.of("completed", "cancelled").contains(next)));
        allowed |=
                patient
                        && Set.of("pending", "accepted").contains(current)
                        && next.equals("cancelled");
        allowed |=
                u.role().equals("admin")
                        && Set.of("pending", "accepted", "in_progress").contains(current)
                        && next.equals("cancelled");
        if (!allowed) throw support.conflict("Invalid request status transition");
        if (Set.of("rejected", "cancelled").contains(next) && note.length() < 5)
            throw invalid("Give a reason (at least 5 characters)");
        if (next.equals("accepted")
                && (!support.visible(support.service((String) r.get("serviceId")))
                        || !accounts.publicProvider((String) r.get("providerId"))))
            throw support.conflict("Service is no longer active");
        if (next.equals("in_progress")
                && LocalDateTime.parse(r.get("date") + "T" + r.get("time"))
                        .isAfter(LocalDateTime.now(ZoneId.of("Asia/Kolkata"))))
            throw support.conflict("The scheduled time has not started");
        r.put("status", next);
        support.history(r, next, u.subjectId(), note);
        db.update(
                "UPDATE care_requests SET status=?,document=? WHERE id=?",
                next,
                store.encode(r),
                id);
        support.audit(u, "request." + next, id, note);
        final String reference = id;
        accounts.providerEmail((String) r.get("providerId"))
                .ifPresent(
                        email ->
                                notifications.queue(
                                        email,
                                        "Arogya Mitra request update",
                                        "Request "
                                                + reference
                                                + " changed to "
                                                + next
                                                + ". Sign in to view its history."));
        return r;
    }
}
