package in.arogyamitra.booking;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import static in.arogyamitra.shared.ApiInput.*;
import in.arogyamitra.booking.dto.CreateBookingRequest;
import in.arogyamitra.security.AccessService;
import in.arogyamitra.auth.AccountRepository;
import in.arogyamitra.patient.PatientService;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    private final BookingService bookings;
    private final AccessService access;private final AccountRepository accounts;private final PatientService patients;
    public BookingController(BookingService bookings,AccessService access,AccountRepository accounts,PatientService patients){this.bookings=bookings;this.access=access;this.accounts=accounts;this.patients=patients;}
    private Map<String,Object> owned(String id){var b=bookings.get(id);var user=access.current();if(user.role().equals("admin")||(user.role().equals("patient")&&user.subjectId().equals(b.get("patientId")))||(user.role().equals("provider")&&user.subjectId().equals(b.get("pid"))))return b;throw access.forbidden();}

    @GetMapping public List<Map<String,Object>> list(@RequestParam(required=false) String patientId,@RequestParam(required=false) String providerId,@RequestParam(required=false) String status){var u=access.current();return bookings.list(u.role().equals("patient")?u.subjectId():patientId,u.role().equals("provider")?u.subjectId():providerId,status);}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Map<String,Object> create(@RequestBody CreateBookingRequest body){var u=access.require("patient");var input=body.toInput();if(!accounts.publicProvider(body.pid()))throw invalid("This provider is not available for booking");var profile=patients.get(u.subjectId());if("Guest".equals(profile.get("name"))||profile.getOrDefault("phone","").toString().isBlank())throw invalid("Save your name and contact phone before booking");input.put("patientId",u.subjectId());input.put("name",profile.get("name"));input.put("village",profile.get("village"));return bookings.book(input);}
    @GetMapping("/{id}") public Map<String,Object> get(@PathVariable String id){return owned(id);}
    @GetMapping("/{id}/history") public Object history(@PathVariable String id){return owned(id).get("history");}
    @PatchMapping("/{id}") public Map<String,Object> status(@PathVariable String id,@RequestBody Map<String,Object> body){owned(id);bookings.status(id,text(body,"status"),access.actor());return bookings.get(id);}
    @PostMapping("/{id}/accept") public Map<String,Object> accept(@PathVariable String id,@RequestBody Map<String,Object> body){return providerAction(id,"confirmed",body);}
    @PostMapping("/{id}/reject") public Map<String,Object> reject(@PathVariable String id,@RequestBody Map<String,Object> body){return providerAction(id,"declined",body);}
    @PostMapping("/{id}/complete") public Map<String,Object> complete(@PathVariable String id,@RequestBody Map<String,Object> body){return providerAction(id,"done",body);}
    @PostMapping("/{id}/no-show") public Map<String,Object> noShow(@PathVariable String id,@RequestBody Map<String,Object> body){return providerAction(id,"no_show",body);}
    @PostMapping("/{id}/cancel") public Map<String,Object> cancel(@PathVariable String id,@RequestBody Map<String,Object> body){owned(id);bookings.status(id,"cancelled",access.actor());return bookings.get(id);}
    private Map<String,Object> providerAction(String id,String status,Map<String,Object> body){access.require("provider");owned(id);bookings.status(id,status,access.actor());return bookings.get(id);}
}
