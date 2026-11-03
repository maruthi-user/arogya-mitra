package in.arogyamitra.care;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController
@RequestMapping("/api/care")
public class CareController {
    private final CareService care;
    public CareController(CareService care){this.care=care;}
    @GetMapping("/services") public Object catalog(@RequestParam(required=false) String village,@RequestParam(required=false) String kind,@RequestParam(required=false) String query,@RequestParam(defaultValue="false") boolean managed){return care.catalog(village,kind,query,managed);}
    @PostMapping("/services") @ResponseStatus(HttpStatus.CREATED) public Object create(@RequestBody Map<String,Object> body){return care.save(null,body);}
    @PatchMapping("/services/{id}") public Object update(@PathVariable String id,@RequestBody Map<String,Object> body){return care.save(id,body);}
    @PostMapping("/services/{id}/review") public Object review(@PathVariable String id,@RequestBody Map<String,Object> body){return care.review(id,body);}
    @PatchMapping("/services/{id}/availability") public Object availabilityState(@PathVariable String id,@RequestBody Map<String,Object> body){return care.availabilityState(id,body);}
    @GetMapping("/services/{id}/availability") public Object slots(@PathVariable String id,@RequestParam String date){return care.availability(id,date);}
    @GetMapping("/requests") public Object requests(){return care.requests();}
    @PostMapping("/requests") @ResponseStatus(HttpStatus.CREATED) public Object request(@RequestBody Map<String,Object> body){return care.request(body);}
    @PatchMapping("/requests/{id}") public Object transition(@PathVariable String id,@RequestBody Map<String,Object> body){return care.transition(id,body);}
    @GetMapping("/organisations") public Object organisations(){return care.organisations();}
    @PatchMapping("/organisations/{id}") public Map<String,Boolean> suspend(@PathVariable String id,@RequestBody Map<String,Object> body){care.suspend(id,body);return Map.of("ok",true);}
    @GetMapping("/staff") public Object staffList(){return care.staffList();}
    @PostMapping("/staff") @ResponseStatus(HttpStatus.CREATED) public Map<String,Boolean> staff(@RequestBody Map<String,Object> body){care.staff(body);return Map.of("ok",true);}
}
