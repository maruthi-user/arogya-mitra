package in.arogyamitra.booking;

import static in.arogyamitra.shared.ApiInput.*;

import in.arogyamitra.auth.AccountRepository;
import in.arogyamitra.notification.NotificationService;
import in.arogyamitra.notification.PatientMessenger;
import in.arogyamitra.patient.PatientService;
import in.arogyamitra.shared.persistence.CatalogRepository;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingService {
    private final in.arogyamitra.reference.ReferenceCatalog reference;
    private final BookingRepository bookings;
    private final CatalogRepository store;
    private final PatientService patients;
    private final AccountRepository accounts;
    private final NotificationService notifications;
    private final PatientMessenger messenger;

    public BookingService(
            BookingRepository bookings,
            CatalogRepository store,
            PatientService patients,
            AccountRepository accounts,
            NotificationService notifications,
            in.arogyamitra.reference.ReferenceCatalog reference,
            PatientMessenger messenger) {
        this.messenger = messenger;
        this.reference = reference;
        this.bookings = bookings;
        this.store = store;
        this.patients = patients;
        this.accounts = accounts;
        this.notifications = notifications;
    }

    @Transactional
    public Map<String, Object> book(Map<String, Object> input) {
        String pid = text(input, "pid"),
                date = text(input, "date"),
                time = text(input, "time"),
                village = text(input, "village"),
                name = text(input, "name");
        String patient = text(input, "patientId");
        if (!(input.get("reason") instanceof String reason) || reason.length() > 300)
            throw invalid("Invalid patient or reason");
        patients.get(patient);
        var provider = store.lockEntity(pid);
        if (!Set.of("mbbs", "rmp", "ayush").contains(provider.get("type")))
            throw invalid("Use this business’s approved service catalog"); // Row lock serializes
        // competing requests,
        // including across app
        // instances.
        var now = LocalDateTime.now(ZoneId.of("Asia/Kolkata"));
        LocalDate day;
        LocalTime slot;
        try {
            day = LocalDate.parse(date);
            slot = LocalTime.parse(time);
        } catch (Exception e) {
            throw invalid("Invalid date or time");
        }
        if (!date.equals(day.toString())
                || !time.equals(slot.toString())
                || !List.of(now.toLocalDate(), now.toLocalDate().plusDays(1)).contains(day)
                || !LocalDateTime.of(day, slot).isAfter(now)
                || !(provider.get("slots") instanceof List<?> slots)
                || !slots.contains(time)
                || !reference.contains("villages", village)
                || name.isBlank()
                || name.length() > 40) throw invalid("Invalid booking details");
        if (bookings.slotReserved(pid, date, time, System.currentTimeMillis()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slot already booked");
        var booking = new LinkedHashMap<String, Object>();
        booking.put("id", UUID.randomUUID().toString());
        booking.put("pid", pid);
        booking.put("date", date);
        booking.put("time", time);
        long expires =
                Math.min(
                        System.currentTimeMillis() + 30 * 60 * 1000,
                        LocalDateTime.of(day, slot)
                                .atZone(ZoneId.of("Asia/Kolkata"))
                                .toInstant()
                                .toEpochMilli());
        booking.put("village", village);
        booking.put("name", name);
        booking.put("status", "pending");
        booking.put("createdAt", System.currentTimeMillis());
        booking.put("patientId", patient);
        booking.put("reason", reason);
        booking.put("expiresAt", expires);
        booking.put("phone", patients.get(patient).getOrDefault("phone", ""));
        booking.put(
                "history",
                List.of(
                        Map.of(
                                "status",
                                "pending",
                                "actor",
                                patient,
                                "at",
                                System.currentTimeMillis())));
        bookings.insert(booking);
        accounts.providerEmail(pid)
                .ifPresent(
                        email ->
                                notifications.queue(
                                        email,
                                        "Arogya Mitra — new appointment request",
                                        "You have a new appointment request for "
                                                + date
                                                + " at "
                                                + time
                                                + " (Asia/Kolkata). Sign in to your provider workspace to review it. Requests expire after 30 minutes or at the appointment start."));
        return booking;
    }

    @Transactional
    public void status(String id, String status, Map<String, Object> actor) {
        String role = text(actor, "role"), actorId = text(actor, "id");
        if (!Set.of("confirmed", "declined", "cancelled", "done", "no_show").contains(status))
            throw invalid("Invalid status");
        String providerId =
                bookings.providerId(id)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Booking not found"));
        store.lockEntity(
                providerId); // Same lock ordering as creation, including acceptance near expiry.
        var booking =
                bookings.lock(id)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Booking not found"));
        String current = (String) booking.get("status");
        if ("pending".equals(current)
                && ((Number) booking.get("expiresAt")).longValue() <= System.currentTimeMillis())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Request expired");
        boolean allowed =
                "patient".equals(role)
                        && actorId.equals(booking.get("patientId"))
                        && Set.of("pending", "confirmed").contains(current)
                        && "cancelled".equals(status);
        allowed |=
                "provider".equals(role)
                        && actorId.equals(booking.get("pid"))
                        && (("pending".equals(current)
                                        && Set.of("confirmed", "declined").contains(status))
                                || ("confirmed".equals(current)
                                        && Set.of("done", "no_show", "cancelled")
                                                .contains(status)));
        if (!allowed)
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Invalid actor or status transition");
        if (Set.of("done", "no_show").contains(status)
                && LocalDateTime.parse(booking.get("date") + "T" + booking.get("time"))
                        .isAfter(LocalDateTime.now(ZoneId.of("Asia/Kolkata"))))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Appointment has not started");
        booking.put("status", status);
        history(booking, status, actorId);
        bookings.update(booking);
        if ("provider".equals(role)
                && Set.of("confirmed", "declined", "cancelled").contains(status))
            textPatientAfterCommit(booking, status);
    }

    /**
     * Tells the patient by SMS/WhatsApp that the provider answered. Sent only once the status
     * change is committed, so a rolled-back change never produces a message, and a failed message
     * never undoes the change.
     */
    private void textPatientAfterCommit(Map<String, Object> booking, String status) {
        String phone = String.valueOf(booking.getOrDefault("phone", "")).trim();
        if (phone.isEmpty()) return;
        String text;
        try {
            text = patientMessage(booking, status);
        } catch (RuntimeException e) {
            return; // A message must never block the status change itself.
        }
        Runnable send = () -> messenger.send(phone, text);
        if (TransactionSynchronizationManager.isSynchronizationActive())
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            send.run();
                        }
                    });
        else send.run();
    }

    private String patientMessage(Map<String, Object> booking, String status) {
        String provider =
                String.valueOf(
                        store.get((String) booking.get("pid"), "providers")
                                .getOrDefault("name", "your provider"));
        String when = booking.get("date") + " " + booking.get("time");
        boolean telugu = false;
        try {
            telugu = "te".equals(patients.get((String) booking.get("patientId")).get("language"));
        } catch (ResponseStatusException e) {
            // Patient record missing: fall back to English.
        }
        if (telugu)
            return switch (status) {
                case "confirmed" ->
                        "ఆరోగ్య మిత్ర: "
                                + provider
                                + " మీ అపాయింట్‌మెంట్‌ను "
                                + when
                                + "కు నిర్ధారించారు.";
                case "declined" ->
                        "ఆరోగ్య మిత్ర: "
                                + provider
                                + " "
                                + when
                                + " అపాయింట్‌మెంట్‌ను అంగీకరించలేదు. దయచేసి మరో సమయం ఎంచుకోండి.";
                default ->
                        "ఆరోగ్య మిత్ర: "
                                + provider
                                + " "
                                + when
                                + " అపాయింట్‌మెంట్‌ను రద్దు చేశారు.";
            };
        return switch (status) {
            case "confirmed" ->
                    "Arogya Mitra: " + provider + " confirmed your appointment on " + when + ".";
            case "declined" ->
                    "Arogya Mitra: "
                            + provider
                            + " could not accept your appointment on "
                            + when
                            + ". Please choose another time.";
            default -> "Arogya Mitra: " + provider + " cancelled your appointment on " + when + ".";
        };
    }

    private void history(Map<String, Object> booking, String status, String actor) {
        var history = new ArrayList<Object>((List<?>) booking.getOrDefault("history", List.of()));
        history.add(Map.of("status", status, "actor", actor, "at", System.currentTimeMillis()));
        booking.put("history", history);
    }

    /**
     * Marks pending requests past their expiry as expired and records it in their history. Runs on
     * a schedule (BookingExpiryJob) instead of on every read; reads show the same result meanwhile
     * through {@link #view}.
     */
    @Transactional
    public int expirePending() {
        long now = System.currentTimeMillis();
        var expired = bookings.expired(now);
        for (var booking : expired) {
            booking.put("status", "expired");
            history(booking, "expired", "system");
            bookings.expireIfPending(booking, now);
        }
        return expired.size();
    }

    /** A pending request whose expiry has passed is shown as expired. */
    private static Map<String, Object> view(Map<String, Object> booking, long now) {
        if (!"pending".equals(booking.get("status"))
                || !(booking.get("expiresAt") instanceof Number expires)
                || expires.longValue() > now) return booking;
        var copy = new LinkedHashMap<>(booking);
        copy.put("status", "expired");
        return copy;
    }

    public List<Map<String, Object>> list(String patientId, String providerId, String status) {
        return list(patientId, providerId, status, 0, 0);
    }

    /** Filtered in SQL; {@code limit} 0 returns every match. */
    public List<Map<String, Object>> list(
            String patientId, String providerId, String status, int offset, int limit) {
        long now = System.currentTimeMillis();
        return bookings.find(patientId, providerId, status, now, offset, limit).stream()
                .map(b -> view(b, now))
                .toList();
    }

    public Map<String, Object> get(String id) {
        return bookings.find(id)
                .map(b -> view(b, System.currentTimeMillis()))
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "Booking not found"));
    }

    public Map<String, Object> availability(String providerId, String date) {
        var p = store.get(providerId, "providers");
        LocalDate day;
        try {
            day = LocalDate.parse(date);
        } catch (Exception e) {
            throw invalid("Invalid date");
        }
        var now = LocalDateTime.now(ZoneId.of("Asia/Kolkata"));
        if (!date.equals(day.toString())
                || !List.of(now.toLocalDate(), now.toLocalDate().plusDays(1)).contains(day))
            throw invalid("Choose today or tomorrow");

        var times =
                ((List<?>) p.get("slots"))
                        .stream()
                                .map(Object::toString)
                                .filter(t -> LocalDateTime.of(day, LocalTime.parse(t)).isAfter(now))
                                .map(
                                        t ->
                                                Map.of(
                                                        "time",
                                                        t,
                                                        "available",
                                                        !bookings.slotReserved(
                                                                providerId,
                                                                date,
                                                                t,
                                                                System.currentTimeMillis())))
                                .toList();
        return Map.of(
                "providerId", providerId, "date", date, "timeZone", "Asia/Kolkata", "slots", times);
    }
}
