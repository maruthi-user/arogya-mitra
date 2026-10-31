package in.arogyamitra.booking;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import in.arogyamitra.shared.persistence.CatalogRepository;
import static in.arogyamitra.shared.ApiInput.*;
import in.arogyamitra.patient.PatientService;
import in.arogyamitra.auth.AccountRepository;
import in.arogyamitra.notification.NotificationService;
@Service
public class BookingService {
    private final BookingRepository bookings;
    private final CatalogRepository store;
    private final PatientService patients;
    private final AccountRepository accounts;private final NotificationService notifications;
    private static final Set<String> VILLAGES=Set.of("rama","krishna","gopala","venkata");
    public BookingService(BookingRepository bookings,CatalogRepository store,PatientService patients,AccountRepository accounts,NotificationService notifications){this.bookings=bookings;this.store=store;this.patients=patients;this.accounts=accounts;this.notifications=notifications;}
    @Transactional public Map<String,Object> book(Map<String,Object> input) {
        String pid = text(input, "pid"), date = text(input, "date"), time = text(input, "time"), village = text(input, "village"), name = text(input, "name");
        String patient = text(input,"patientId");
        if (!(input.get("reason") instanceof String reason) || reason.length() > 300) throw invalid("Invalid patient or reason");
        patients.get(patient);
        var provider = store.lockEntity(pid); // Row lock serializes competing requests, including across app instances.
        var now = LocalDateTime.now(ZoneId.of("Asia/Kolkata"));
        LocalDate day; LocalTime slot;
        try { day = LocalDate.parse(date); slot = LocalTime.parse(time); }
        catch (Exception e) { throw invalid("Invalid date or time"); }
        if (!date.equals(day.toString()) || !time.equals(slot.toString()) || !List.of(now.toLocalDate(), now.toLocalDate().plusDays(1)).contains(day)
            || !LocalDateTime.of(day,slot).isAfter(now) || !(provider.get("slots") instanceof List<?> slots) || !slots.contains(time)
            || !VILLAGES.contains(village) || name.isBlank() || name.length() > 40) throw invalid("Invalid booking details");
        if (bookings.slotReserved(pid,date,time,System.currentTimeMillis()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slot already booked");
        var booking = new LinkedHashMap<String,Object>();
        booking.put("id", UUID.randomUUID().toString()); booking.put("pid",pid); booking.put("date",date); booking.put("time",time);
        long expires = Math.min(System.currentTimeMillis()+30*60*1000,LocalDateTime.of(day,slot).atZone(ZoneId.of("Asia/Kolkata")).toInstant().toEpochMilli());
        booking.put("village",village); booking.put("name",name); booking.put("status","pending"); booking.put("createdAt",System.currentTimeMillis());
        booking.put("patientId",patient); booking.put("reason",reason); booking.put("expiresAt",expires);
        booking.put("phone",patients.get(patient).getOrDefault("phone",""));
        booking.put("history",List.of(Map.of("status","pending","actor",patient,"at",System.currentTimeMillis())));
        bookings.insert(booking);
        accounts.providerEmail(pid).ifPresent(email->notifications.queue(email,"Arogya Mitra — new appointment request","You have a new appointment request for "+date+" at "+time+" (Asia/Kolkata). Sign in to your provider workspace to review it. Requests expire after 30 minutes or at the appointment start."));
        return booking;
    }
    @Transactional public void status(String id, String status, Map<String,Object> actor) {
        String role=text(actor,"role"), actorId=text(actor,"id");
        if (!Set.of("confirmed","declined","cancelled","done","no_show").contains(status)) throw invalid("Invalid status");
        String providerId=bookings.providerId(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Booking not found"));
        store.lockEntity(providerId); // Same lock ordering as creation, including acceptance near expiry.
        var booking=bookings.lock(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Booking not found"));
        String current=(String)booking.get("status");
        if ("pending".equals(current) && ((Number)booking.get("expiresAt")).longValue() <= System.currentTimeMillis())
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Request expired");
        boolean allowed = "patient".equals(role) && actorId.equals(booking.get("patientId")) && Set.of("pending","confirmed").contains(current) && "cancelled".equals(status);
        allowed |= "provider".equals(role) && actorId.equals(booking.get("pid")) &&
            (("pending".equals(current) && Set.of("confirmed","declined").contains(status)) || ("confirmed".equals(current) && Set.of("done","no_show","cancelled").contains(status)));
        if (!allowed) throw new ResponseStatusException(HttpStatus.CONFLICT,"Invalid actor or status transition");
        if (Set.of("done","no_show").contains(status) && LocalDateTime.parse(booking.get("date")+"T"+booking.get("time")).isAfter(LocalDateTime.now(ZoneId.of("Asia/Kolkata"))))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Appointment has not started");
        booking.put("status",status);
        history(booking,status,actorId);
        bookings.update(booking);
    }
    private void history(Map<String,Object> booking, String status, String actor) {
        var history = new ArrayList<Object>((List<?>)booking.getOrDefault("history",List.of()));
        history.add(Map.of("status",status,"actor",actor,"at",System.currentTimeMillis())); booking.put("history",history);
    }
    private void expire() {
        var expired = bookings.expired(System.currentTimeMillis());
        for (var booking : expired) {
            booking.put("status","expired"); history(booking,"expired","system");
            bookings.expireIfPending(booking,System.currentTimeMillis());
        }
    }

    public List<Map<String,Object>> list(String patientId,String providerId,String status) {
        expire();
        return bookings.list().stream()
            .filter(b->patientId==null||patientId.equals(b.get("patientId")))
            .filter(b->providerId==null||providerId.equals(b.get("pid")))
            .filter(b->status==null||status.equals(b.get("status"))).toList();
    }
    public Map<String,Object> get(String id){
        return list(null,null,null).stream().filter(b->id.equals(b.get("id"))).findFirst()
            .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Booking not found"));
    }
    public Map<String,Object> availability(String providerId,String date){
        var p=store.get(providerId,"providers");
        LocalDate day;
        try{day=LocalDate.parse(date);}catch(Exception e){throw invalid("Invalid date");}
        var now=LocalDateTime.now(ZoneId.of("Asia/Kolkata"));
        if(!date.equals(day.toString())||!List.of(now.toLocalDate(),now.toLocalDate().plusDays(1)).contains(day))throw invalid("Choose today or tomorrow");
        var reserved=list(null,providerId,null).stream().filter(b->date.equals(b.get("date"))&&Set.of("pending","confirmed").contains(b.get("status"))).map(b->b.get("time")).toList();
        var times=((List<?>)p.get("slots")).stream().map(Object::toString).filter(t->LocalDateTime.of(day,LocalTime.parse(t)).isAfter(now)).map(t->Map.of("time",t,"available",!reserved.contains(t))).toList();
        return Map.of("providerId",providerId,"date",date,"timeZone","Asia/Kolkata","slots",times);
    }
}
