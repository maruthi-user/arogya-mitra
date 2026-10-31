package in.arogyamitra.provider;

import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import in.arogyamitra.booking.BookingService;
import in.arogyamitra.security.AccessService;
import in.arogyamitra.auth.AccountRepository;
import static in.arogyamitra.shared.ApiInput.*;

@RestController
@RequestMapping("/api/providers")
public class ProviderController {
    private final ProviderService providers;
    private final BookingService bookings;
    private final AccessService access;private final AccountRepository accounts;
    public ProviderController(ProviderService providers,BookingService bookings,AccessService access,AccountRepository accounts){this.providers=providers;this.bookings=bookings;this.access=access;this.accounts=accounts;}
    private void readable(String id){var u=access.optional();if(accounts.publicProvider(id)||(u!=null&&(u.role().equals("admin")||(u.role().equals("provider")&&u.subjectId().equals(id)))))return;throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND,"Provider not found");}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Map<String,Object> create(@RequestBody Map<String,Object> body){access.require("admin");return providers.create(body);}
    @GetMapping public List<Map<String,Object>> list(@RequestParam(required=false) String village,@RequestParam(required=false) String type,@RequestParam(required=false) Boolean open){var u=access.optional();return providers.list(village,type,open).stream().filter(p->(u!=null&&u.role().equals("admin"))||accounts.publicProvider((String)p.get("id"))).toList();}
    @GetMapping("/{id}") public Map<String,Object> get(@PathVariable String id){readable(id);return providers.get(id);}
    @GetMapping("/{id}/bookings") public List<Map<String,Object>> bookings(@PathVariable String id,@RequestParam(required=false) String status){access.provider(id);providers.get(id);return bookings.list(null,id,status);}
    @GetMapping("/{id}/slots") public Map<String,Object> slots(@PathVariable String id,@RequestParam String date){readable(id);return bookings.availability(id,date);}
    @PatchMapping("/{id}/profile") public Map<String,Object> profile(@PathVariable String id,@RequestBody Map<String,Object> body){access.provider(id);providers.profile(id,body);return providers.get(id);}
    @PatchMapping("/{id}/schedule") public Map<String,Object> schedule(@PathVariable String id,@RequestBody Map<String,Object> body){access.provider(id);providers.schedule(id,body);return providers.get(id);}
    @PatchMapping("/{id}/open") public Map<String,Object> open(@PathVariable String id,@RequestBody Map<String,Object> body){access.provider(id);providers.get(id);providers.open(id,bool(body,"open"));return providers.get(id);}
}
