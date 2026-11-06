package in.arogyamitra.booking;

import in.arogyamitra.shared.persistence.CatalogRepository;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Persistence only. The service owns transactions and provider-before-booking lock ordering. */
@Repository
@org.springframework.transaction.annotation.Transactional
public class BookingRepository {
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager em;
    private final JdbcTemplate db;
    private final CatalogRepository documents;

    public BookingRepository(JdbcTemplate db, CatalogRepository documents) {
        this.db = db;
        this.documents = documents;
    }

    public boolean slotReserved(String provider, String date, String time, long now) {
        int start = java.time.LocalTime.parse(time).toSecondOfDay() / 60;
        for (var r :
                db.query(
                        "SELECT document FROM care_requests WHERE provider_id=? AND request_date=? AND (status IN ('accepted','in_progress') OR (status='pending' AND expires_at>?))",
                        (rs, n) -> documents.decode(rs.getString(1)),
                        provider,
                        date,
                        now)) {
            int other = java.time.LocalTime.parse((String) r.get("time")).toSecondOfDay() / 60,
                    duration = ((Number) r.getOrDefault("durationMinutes", 30)).intValue();
            if (start < other + duration && other < start + 30) return true;
        }
        for (String slot :
                db.query(
                        "SELECT booking_time FROM bookings WHERE pid=? AND booking_date=? AND (status='confirmed' OR (status='pending' AND expires_at>?))",
                        (rs, n) -> rs.getString(1),
                        provider,
                        date,
                        now)) {
            int other = java.time.LocalTime.parse(slot).toSecondOfDay() / 60;
            if (start < other + 30 && other < start + 30) return true;
        }
        return false;
    }

    public void insert(Map<String, Object> booking) {
        var r = new in.arogyamitra.shared.entity.BookingRecord();
        r.id = (String) booking.get("id");
        r.providerId = (String) booking.get("pid");
        r.patientId = (String) booking.get("patientId");
        r.date = (String) booking.get("date");
        r.time = (String) booking.get("time");
        r.status = (String) booking.get("status");
        r.document = documents.encode(booking);
        r.expiresAt = ((Number) booking.get("expiresAt")).longValue();
        em.persist(r);
        em.flush();
    }

    public Optional<String> providerId(String id) {
        return em.createQuery(
                        "select b.providerId from BookingRecord b where b.id=:id", String.class)
                .setParameter("id", id)
                .getResultStream()
                .findFirst();
    }

    public Optional<Map<String, Object>> lock(String id) {
        var r =
                em.find(
                        in.arogyamitra.shared.entity.BookingRecord.class,
                        id,
                        jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (r != null) em.refresh(r, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        return Optional.ofNullable(r).map(record -> documents.decode(record.document));
    }

    public void update(Map<String, Object> booking) {
        var r = em.find(in.arogyamitra.shared.entity.BookingRecord.class, booking.get("id"));
        r.status = (String) booking.get("status");
        r.document = documents.encode(booking);
        em.flush();
    }

    public List<Map<String, Object>> expired(long now) {
        return em
                .createQuery(
                        "select b from BookingRecord b where b.status='pending' and b.expiresAt<=:now",
                        in.arogyamitra.shared.entity.BookingRecord.class)
                .setParameter("now", now)
                .getResultList()
                .stream()
                .map(b -> documents.decode(b.document))
                .toList();
    }

    public void expireIfPending(Map<String, Object> booking, long now) {
        em.createQuery(
                        "update BookingRecord b set b.status='expired',b.document=:document where b.id=:id and b.status='pending' and b.expiresAt<=:now")
                .setParameter("document", documents.encode(booking))
                .setParameter("id", booking.get("id"))
                .setParameter("now", now)
                .executeUpdate();
    }

    /**
     * Bookings matching the given filters (each null filter is ignored), ordered by appointment
     * time. The filters run in SQL on indexed columns. {@code limit} 0 means no limit.
     */
    public List<Map<String, Object>> find(
            String patientId, String providerId, String status, long now, int offset, int limit) {
        var jpql = new StringBuilder("select b from BookingRecord b where 1=1");
        if (patientId != null) jpql.append(" and b.patientId=:patientId");
        if (providerId != null) jpql.append(" and b.providerId=:providerId");
        // A pending request past its expiry counts as expired even before the expiry job has
        // rewritten it, so the "pending" and "expired" filters account for that.
        if ("pending".equals(status)) jpql.append(" and b.status='pending' and b.expiresAt>:now");
        else if ("expired".equals(status))
            jpql.append(" and (b.status='expired' or (b.status='pending' and b.expiresAt<=:now))");
        else if (status != null) jpql.append(" and b.status=:status");
        jpql.append(" order by b.date,b.time,b.id");
        var query =
                em.createQuery(jpql.toString(), in.arogyamitra.shared.entity.BookingRecord.class);
        if (patientId != null) query.setParameter("patientId", patientId);
        if (providerId != null) query.setParameter("providerId", providerId);
        if ("pending".equals(status) || "expired".equals(status)) query.setParameter("now", now);
        else if (status != null) query.setParameter("status", status);
        if (offset > 0) query.setFirstResult(offset);
        if (limit > 0) query.setMaxResults(limit);
        return query.getResultList().stream().map(b -> documents.decode(b.document)).toList();
    }

    public Optional<Map<String, Object>> find(String id) {
        return Optional.ofNullable(em.find(in.arogyamitra.shared.entity.BookingRecord.class, id))
                .map(b -> documents.decode(b.document));
    }
}
