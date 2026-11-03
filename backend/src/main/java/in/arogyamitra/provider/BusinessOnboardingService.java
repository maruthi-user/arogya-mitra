package in.arogyamitra.provider;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import in.arogyamitra.shared.persistence.CatalogRepository;
import in.arogyamitra.security.AccessService;
import in.arogyamitra.registration.ApplicationDocuments;
import in.arogyamitra.auth.AccountRepository;
import in.arogyamitra.notification.NotificationService;
import in.arogyamitra.reference.ReferenceCatalog;
import static in.arogyamitra.shared.ApiInput.*;

@Service
public class BusinessOnboardingService {
    private final JdbcTemplate db;private final CatalogRepository store;private final AccessService access;
    private final ApplicationDocuments documents;private final ReferenceCatalog reference;private final AccountRepository accounts;private final NotificationService notifications;
    public BusinessOnboardingService(JdbcTemplate db,CatalogRepository store,AccessService access,ApplicationDocuments documents,ReferenceCatalog reference,AccountRepository accounts,NotificationService notifications){this.db=db;this.store=store;this.access=access;this.documents=documents;this.reference=reference;this.accounts=accounts;this.notifications=notifications;}
    public Map<String,Object> profile(String id){access.provider(id);return read(id);}
    private Map<String,Object> read(String id){
        var rows=db.query("SELECT document FROM provider_business_profiles WHERE provider_id=?",(r,n)->store.decode(r.getString(1)),id);
        var p=rows.isEmpty()?new LinkedHashMap<>(store.get(id,"providers")):new LinkedHashMap<>(rows.get(0));
        p.put("providerId",id);p.putIfAbsent("status","approved");p.putIfAbsent("active",true);p.put("documents",documents.list("business:"+id));return p;
    }
    private String field(Map<String,Object> body,String key,int max,boolean required){Object value=body.getOrDefault(key,"");if(!(value instanceof String s)||s.length()>max||(required&&s.isBlank()))throw invalid("Invalid "+key);return s.trim();}
    private void persist(String id,Map<String,Object> p){var copy=new LinkedHashMap<>(p);copy.remove("documents");long now=System.currentTimeMillis();copy.put("updatedAt",now);int updated=db.update("UPDATE provider_business_profiles SET status=?,active=?,document=?,updated_at=? WHERE provider_id=?",copy.get("status"),copy.get("active"),store.encode(copy),now,id);if(updated==0)db.update("INSERT INTO provider_business_profiles(provider_id,status,active,document,updated_at) VALUES(?,?,?,?,?)",id,copy.get("status"),copy.get("active"),store.encode(copy),now);}
    private void audit(String id,String action,String reason){var u=access.current();db.update("INSERT INTO audit_events(id,actor_id,action,resource_id,detail,created_at) VALUES(?,?,?,?,?,?)",UUID.randomUUID().toString(),u.accountId(),action,id,reason,System.currentTimeMillis());}
    @Transactional public Map<String,Object> save(String id,Map<String,Object> body){
        access.provider(id);var entity=store.lockEntity(id);var p=read(id);
        if("pending".equals(p.get("status")))throw invalid("Wait for review before editing your business");
        if(db.queryForObject("SELECT COUNT(*) FROM care_requests WHERE provider_id=? AND status IN ('pending','accepted','in_progress')",Integer.class,id)>0)throw invalid("Finish or cancel open requests before editing your business");
        String type=field(body,"businessType",30,true);if(!reference.contains("businessTypes",type))throw invalid("Choose a business type");
        if(db.queryForObject("SELECT COUNT(*) FROM care_services WHERE provider_id=?",Integer.class,id)>0&&!type.equals(entity.getOrDefault("businessType","practitioner")))throw invalid("Business type cannot change after services are created");
        for(String key:List.of("organization","address","registrationId","designation","village"))p.put(key,field(body,key,key.equals("address")?300:100,false));
        p.put("businessType",type);p.put("active",Boolean.TRUE.equals(body.getOrDefault("active",true)));p.put("status","draft");
        documents.save("business:"+id,body.get("documents"));persist(id,p);
        entity.put("businessType",type);entity.put("organization",p.get("organization"));store.save(id,entity);
        audit(id,"business.draft","");return read(id);
    }
    private void validate(Map<String,Object> p){
        for(String k:List.of("organization","address","village","registrationId"))if(p.getOrDefault(k,"").toString().trim().length()<(k.equals("address")?5:1))throw invalid("Complete business name, address, location and registration/license ID");
        if(!reference.contains("villages",p.get("village").toString()))throw invalid("Choose a valid location");
        if(Set.of("practitioner","hospital","clinic").contains(p.get("businessType"))&&!Set.of("mbbs","rmp","ayush").contains(p.getOrDefault("designation","")))throw invalid("Choose your clinical qualification");
        if(documents.list("business:"+p.get("providerId")).isEmpty())throw invalid("Upload at least one supporting license or credential document");
    }
    @Transactional public Map<String,Object> submit(String id){
        access.provider(id);store.lockEntity(id);var p=read(id);if(!Set.of("draft","rejected").contains(p.get("status")))throw invalid("Only drafts or rejected businesses can be submitted");validate(p);
        if(db.queryForObject("SELECT COUNT(*) FROM care_services WHERE provider_id=?",Integer.class,id)==0)throw invalid("Add at least one service before submitting your business");
        p.put("status","pending");p.put("submittedAt",System.currentTimeMillis());persist(id,p);audit(id,"business.submitted","");return read(id);
    }
    public List<Map<String,Object>> queue(){access.require("admin");return db.query("SELECT provider_id FROM provider_business_profiles ORDER BY updated_at DESC",(r,n)->r.getString(1)).stream().map(this::read).toList();}
    @Transactional public Map<String,Object> review(String id,Map<String,Object> body){
        access.require("admin");var entity=store.lockEntity(id);var p=read(id);if(!"pending".equals(p.get("status")))throw invalid("Only pending businesses can be reviewed");
        String decision=field(body,"decision",20,true),reason=field(body,"reason",1000,true);if(!Set.of("approved","rejected").contains(decision)||reason.length()<5)throw invalid("Choose a decision and provide a reason (5–1000 characters)");
        if(decision.equals("approved"))validate(p);p.put("status",decision);p.put("reviewReason",reason);p.put("reviewedAt",System.currentTimeMillis());p.put("reviewedBy",access.current().accountId());persist(id,p);
        if(decision.equals("approved")){for(String key:List.of("organization","address","village","businessType","registrationId"))entity.put(key,p.get(key));entity.put("type",Set.of("practitioner","hospital","clinic").contains(p.get("businessType"))?p.get("designation"):p.get("businessType"));store.save(id,entity);
            for(var service:db.query("SELECT document FROM care_services WHERE provider_id=?",(r,n)->store.decode(r.getString(1)),id)){service.put("organization",p.get("organization"));db.update("UPDATE care_services SET document=? WHERE id=?",store.encode(service),service.get("id"));}
        }
        audit(id,"business."+decision,reason);accounts.providerEmail(id).ifPresent(email->notifications.queue(email,"Arogya Mitra business review",decision+"\n"+reason));return read(id);
    }
    public Object files(String id){access.provider(id);return documents.list("business:"+id);}
    public org.springframework.http.ResponseEntity<byte[]> download(String provider,String document){access.provider(provider);if(documents.list("business:"+provider).stream().noneMatch(d->document.equals(d.get("id"))))throw access.forbidden();return documents.download(document);}
    public Object notifications(){var u=access.require("provider");return db.query("SELECT action,detail,created_at FROM audit_events WHERE resource_id=? OR resource_id IN (SELECT id FROM care_services WHERE provider_id=?) ORDER BY created_at DESC LIMIT 100",(r,n)->Map.of("action",r.getString(1),"reason",r.getString(2),"at",r.getLong(3)),u.subjectId(),u.subjectId());}
}

@RestController
@RequestMapping("/api/onboarding")
class BusinessOnboardingController {
    private final BusinessOnboardingService service;
    BusinessOnboardingController(BusinessOnboardingService service){this.service=service;}
    @GetMapping("/businesses/{id}") public Object get(@PathVariable String id){return service.profile(id);}
    @PutMapping("/businesses/{id}") public Object save(@PathVariable String id,@RequestBody Map<String,Object> body){return service.save(id,body);}
    @PostMapping("/businesses/{id}/submit") public Object submit(@PathVariable String id){return service.submit(id);}
    @GetMapping("/businesses") public Object queue(){return service.queue();}
    @PostMapping("/businesses/{id}/review") public Object review(@PathVariable String id,@RequestBody Map<String,Object> body){return service.review(id,body);}
    @GetMapping("/businesses/{id}/documents/{document}") public Object download(@PathVariable String id,@PathVariable String document){return service.download(id,document);}
    @GetMapping("/notifications") public Object notifications(){return service.notifications();}
}
