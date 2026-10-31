package in.arogyamitra.pharmacy;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import in.arogyamitra.security.AccessService;
import in.arogyamitra.shared.persistence.CatalogRepository;
import static in.arogyamitra.shared.ApiInput.*;

@RestController
@RequestMapping("/api/medicine-requests")
public class MedicineRequestController {
    private final JdbcTemplate db;private final AccessService access;private final CatalogRepository store;
    public MedicineRequestController(JdbcTemplate db,AccessService access,CatalogRepository store){this.db=db;this.access=access;this.store=store;}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Map<String,Object> create(@RequestBody Map<String,Object> body){
        var user=access.require("patient");String pharmacy=text(body,"pharmacyId"),medicine=text(body,"medicineId");store.get(pharmacy,"pharmacies");
        if(!Set.of("para","ors","cetirizine","antacid","cough","iron","amox").contains(medicine))throw invalid("Unknown medicine");
        String message=body.getOrDefault("message","") instanceof String m?m.trim():"";if(message.length()>500)throw invalid("Message is too long");
        String id=UUID.randomUUID().toString();db.update("INSERT INTO service_requests(id,patient_id,pharmacy_id,medicine_id,message,status,created_at) VALUES(?,?,?,?,?,'requested',?)",id,user.subjectId(),pharmacy,medicine,message,System.currentTimeMillis());return Map.of("id",id,"status","requested");
    }
    @GetMapping public List<Map<String,Object>> list(){var u=access.current();return db.query("SELECT r.*,p.name patient_name,e.document pharmacy FROM service_requests r JOIN patients p ON p.id=r.patient_id JOIN entities e ON e.id=r.pharmacy_id WHERE (?='admin' OR r.patient_id=?) ORDER BY r.created_at DESC",(r,n)->Map.of("id",r.getString("id"),"patientName",r.getString("patient_name"),"pharmacyName",store.decode(r.getString("pharmacy")).get("name"),"medicineId",r.getString("medicine_id"),"message",r.getString("message"),"status",r.getString("status"),"createdAt",r.getLong("created_at")),u.role(),u.subjectId());}
    @PatchMapping("/{id}") public Map<String,Boolean> update(@PathVariable String id,@RequestBody Map<String,Object> body){access.require("admin");String status=text(body,"status");if(!Set.of("contacted","resolved").contains(status))throw invalid("Invalid status");int n=db.update("UPDATE service_requests SET status=? WHERE id=? AND status<>'resolved'",status,id);if(n!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"Request was already resolved or not found");return Map.of("ok",true);}
}
