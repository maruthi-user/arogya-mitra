package in.arogyamitra.admin;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import in.arogyamitra.security.AccessService;
import in.arogyamitra.registration.ProviderApplicationService;
import in.arogyamitra.notification.NotificationService;
import in.arogyamitra.shared.persistence.CatalogRepository;
import static in.arogyamitra.shared.ApiInput.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AccessService access;private final ProviderApplicationService applications;private final NotificationService notifications;private final JdbcTemplate db;private final CatalogRepository store;
    public AdminController(AccessService access,ProviderApplicationService applications,NotificationService notifications,JdbcTemplate db,CatalogRepository store){this.access=access;this.applications=applications;this.notifications=notifications;this.db=db;this.store=store;}
    @GetMapping("/applications") public List<Map<String,Object>> applications(){access.require("admin");return applications.list();}
    @PostMapping("/applications/{id}/review") public Map<String,Object> review(@PathVariable String id,@RequestBody Map<String,Object> body){var admin=access.require("admin");if(!(body.get("reason") instanceof String reason))throw invalid("Review reason required");return applications.review(id,text(body,"decision"),reason,admin.accountId());}
    @GetMapping("/notifications") public List<Map<String,Object>> notifications(){access.require("admin");return notifications.list();}
    @PostMapping("/notifications/{id}/retry") public Map<String,Boolean> retry(@PathVariable String id){access.require("admin");notifications.retry(id);return Map.of("ok",true);}
    @GetMapping("/audit") public List<Map<String,Object>> audit(){access.require("admin");return db.query("SELECT actor_id,action,resource_id,detail,created_at FROM audit_events ORDER BY created_at DESC LIMIT 200",(r,n)->Map.of("actorId",r.getString(1),"action",r.getString(2),"resourceId",r.getString(3),"detail",r.getString(4),"createdAt",r.getLong(5)));}
    @GetMapping("/pharmacies") public List<Map<String,Object>> pharmacies(){access.require("admin");return store.entities("pharmacies");}
    @PostMapping("/pharmacies") @ResponseStatus(HttpStatus.CREATED) public Map<String,Object> createPharmacy(@RequestBody Map<String,Object> body){
        access.require("admin");String name=text(body,"name"),phone=text(body,"phone"),village=text(body,"village");
        if(!phone.matches("(?:\\+91)?[6-9]\\d{9}")||!Set.of("rama","krishna","gopala","venkata").contains(village))throw invalid("Invalid pharmacy details");
        String id="s-"+UUID.randomUUID();var stock=new LinkedHashMap<String,Object>();for(String med:List.of("para","ors","cetirizine","antacid","cough","iron","amox"))stock.put(med,false);
        var profile=new LinkedHashMap<String,Object>();profile.put("id",id);profile.put("name",name);profile.put("phone",phone);profile.put("village",village);profile.put("open",true);profile.put("delivery",false);profile.put("stock",stock);store.create(id,"pharmacies",profile);return profile;
    }
}
