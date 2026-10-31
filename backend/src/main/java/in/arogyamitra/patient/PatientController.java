package in.arogyamitra.patient;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import in.arogyamitra.booking.BookingService;
import in.arogyamitra.security.AccessService;

@RestController
@RequestMapping("/api/patients")
public class PatientController {
    private final PatientService patients;
    private final BookingService bookings;
    private final AccessService access;
    public PatientController(PatientService patients,BookingService bookings,AccessService access){this.patients=patients;this.bookings=bookings;this.access=access;}
    @GetMapping public List<Map<String,Object>> list(){access.require("admin");return patients.list();}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Map<String,Object> create(@RequestBody Map<String,Object> body){access.require("admin");return patients.create(body);}
    @GetMapping("/{id}") public Map<String,Object> get(@PathVariable String id){access.patient(id);return patients.get(id);}
    @PatchMapping("/{id}") public Map<String,Object> update(@PathVariable String id,@RequestBody Map<String,Object> body){access.patient(id);return patients.update(id,body);}
    @GetMapping("/{id}/bookings") public List<Map<String,Object>> bookings(@PathVariable String id,@RequestParam(required=false) String status){access.patient(id);patients.get(id);return bookings.list(id,null,status);}
}
