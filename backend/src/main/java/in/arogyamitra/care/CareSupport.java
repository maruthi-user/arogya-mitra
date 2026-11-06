package in.arogyamitra.care;

import static in.arogyamitra.shared.ApiInput.*;

import in.arogyamitra.auth.*;
import in.arogyamitra.security.*;
import in.arogyamitra.shared.persistence.CatalogRepository;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

/**
 * Lookups, input parsing, capacity checks, expiry and audit shared by the care services (catalog,
 * requests, organisations).
 */
@org.springframework.stereotype.Component
class CareSupport {
    private final JdbcTemplate db;
    private final CatalogRepository store;
    private final AccountRepository accounts;

    CareSupport(JdbcTemplate db, CatalogRepository store, AccountRepository accounts) {
        this.db = db;
        this.store = store;
        this.accounts = accounts;
    }

    ResponseStatusException conflict(String m) {
        return new ResponseStatusException(HttpStatus.CONFLICT, m);
    }

    Map<String, Object> service(String id) {
        return db
                .query(
                        "SELECT document FROM care_services WHERE id=?",
                        (r, n) -> store.decode(r.getString(1)),
                        id)
                .stream()
                .findFirst()
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "Service not found"));
    }

    String string(Map<String, Object> body, String key, int max, boolean required) {
        Object v = body.get(key);
        if (!(v instanceof String s) || s.length() > max || (required && s.isBlank()))
            throw invalid("Invalid " + key);
        return s.trim();
    }

    int number(Map<String, Object> body, String key, int min, int max) {
        if (!(body.get(key) instanceof Number n)
                || !Double.isFinite(n.doubleValue())
                || n.doubleValue() != n.intValue()
                || n.intValue() < min
                || n.intValue() > max) throw invalid("Invalid " + key);
        return n.intValue();
    }

    boolean visible(Map<String, Object> s) {
        String assigned = (String) s.getOrDefault("practitionerId", "");
        return (assigned.isEmpty()
                        || db.queryForObject(
                                        "SELECT COUNT(*) FROM accounts WHERE id=? AND subject_id=? AND active=TRUE AND suspended=FALSE AND role='provider'",
                                        Integer.class,
                                        assigned,
                                        s.get("providerId"))
                                > 0)
                && "approved".equals(s.get("approval"))
                && Boolean.TRUE.equals(s.get("active"))
                && accounts.publicProvider((String) s.get("providerId"));
    }

    LocalDate date(String value) {
        try {
            LocalDate day = LocalDate.parse(value);
            LocalDate now = LocalDate.now(ZoneId.of("Asia/Kolkata"));
            if (!value.equals(day.toString()) || day.isBefore(now) || day.isAfter(now.plusDays(30)))
                throw invalid("Choose a date within 30 days");
            return day;
        } catch (java.time.format.DateTimeParseException e) {
            throw invalid("Invalid date");
        }
    }

    void expire() {
        expire(null);
    }

    void expire(String provider) {
        for (var r :
                db.query(
                        "SELECT document FROM care_requests WHERE status='pending' AND expires_at<=? AND (CAST(? AS VARCHAR(80)) IS NULL OR provider_id=?)",
                        (rs, n) -> store.decode(rs.getString(1)),
                        System.currentTimeMillis(),
                        provider,
                        provider)) {
            r.put("status", "expired");
            history(r, "expired", "system", "");
            db.update(
                    "UPDATE care_requests SET status='expired',document=? WHERE id=? AND status='pending' AND expires_at<=?",
                    store.encode(r),
                    r.get("id"),
                    System.currentTimeMillis());
        }
    }

    boolean overlaps(String time, int duration, String other, int otherDuration) {
        int a = LocalTime.parse(time).toSecondOfDay() / 60,
                b = LocalTime.parse(other).toSecondOfDay() / 60;
        return a < b + otherDuration && b < a + duration;
    }

    int used(Map<String, Object> s, String date, String time) {
        int count = 0, duration = ((Number) s.getOrDefault("durationMinutes", 30)).intValue();
        for (var r :
                db.query(
                        "SELECT document FROM care_requests WHERE provider_id=? AND request_date=? AND (status IN ('accepted','in_progress') OR (status='pending' AND expires_at>?))",
                        (rs, n) -> store.decode(rs.getString(1)),
                        s.get("providerId"),
                        date,
                        System.currentTimeMillis()))
            if (s.get("resource").equals(r.get("resource"))
                    && overlaps(
                            time,
                            duration,
                            (String) r.get("time"),
                            ((Number) r.getOrDefault("durationMinutes", 30)).intValue())) count++;
        // Legacy appointments reserve 30 minutes against every organisation resource.
        for (String legacy :
                db.query(
                        "SELECT booking_time FROM bookings WHERE pid=? AND booking_date=? AND (status='confirmed' OR (status='pending' AND expires_at>?))",
                        (rs, n) -> rs.getString(1),
                        s.get("providerId"),
                        date,
                        System.currentTimeMillis()))
            if (overlaps(time, duration, legacy, 30)) count++;
        return count;
    }

    @SuppressWarnings("unchecked")
    void history(Map<String, Object> r, String status, String actor, String note) {
        var h = new ArrayList<>((List<Object>) r.get("history"));
        h.add(
                Map.of(
                        "status",
                        status,
                        "actor",
                        actor,
                        "note",
                        note,
                        "at",
                        System.currentTimeMillis()));
        r.put("history", h);
    }

    void audit(Identity u, String action, String id, String detail) {
        db.update(
                "INSERT INTO audit_events(id,actor_id,action,resource_id,detail,created_at) VALUES(?,?,?,?,?,?)",
                UUID.randomUUID().toString(),
                u.accountId().isBlank() ? u.subjectId() : u.accountId(),
                action,
                id,
                detail,
                System.currentTimeMillis());
    }
}
