package in.arogyamitra.registration;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import in.arogyamitra.shared.persistence.CatalogRepository;
import in.arogyamitra.auth.*;
import in.arogyamitra.notification.NotificationService;
import static in.arogyamitra.shared.ApiInput.*;

@Service
public class ProviderApplicationService {
    private final JdbcTemplate db;private final CatalogRepository store;private final AccountRepository accounts;
    private final ActivationService activation;private final NotificationService notifications;
    public ProviderApplicationService(JdbcTemplate db,CatalogRepository store,AccountRepository accounts,ActivationService activation,NotificationService notifications){this.db=db;this.store=store;this.accounts=accounts;this.activation=activation;this.notifications=notifications;}
    private String field(Map<String,Object> input,String key,int max){String v=text(input,key).trim();if(v.length()>max)throw invalid("Invalid "+key);return v;}
    @Transactional public Map<String,Object> submit(Map<String,Object> input){
        String name=field(input,"name",80),username=field(input,"username",50).toLowerCase(Locale.ROOT),email=field(input,"email",100).toLowerCase(Locale.ROOT);
        String phone=field(input,"phone",20).replaceAll("[\\s-]",""),organization=field(input,"organization",100),designation=field(input,"designation",20),village=field(input,"village",30);
        if(!username.matches("[a-z0-9_.-]{3,50}")||!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")||!phone.matches("(?:\\+91)?[6-9]\\d{9}")||!Set.of("mbbs","rmp","ayush").contains(designation)||!Set.of("rama","krishna","gopala","venkata").contains(village))throw invalid("Check your username, email, phone, designation and village");
        String registration=input.getOrDefault("registrationId","") instanceof String v?v.trim():"";
        if(registration.length()>100)throw invalid("Registration ID is too long");
        if(accounts.login(username).isPresent()||accounts.login(email).isPresent())throw new ResponseStatusException(HttpStatus.CONFLICT,"An account or application already uses these details");
        String id=UUID.randomUUID().toString();long now=System.currentTimeMillis();
        var application=new LinkedHashMap<String,Object>();application.put("id",id);application.put("name",name);application.put("username",username);application.put("email",email);application.put("phone",phone);application.put("organization",organization);application.put("designation",designation);application.put("village",village);application.put("registrationId",registration);application.put("status","pending");application.put("submittedAt",now);
        db.update("INSERT INTO provider_applications(id,username,email,status,document,submitted_at) VALUES(?,?,?,'pending',?,?)",id,username,email,store.encode(application),now);
        notifications.queue(email,"Arogya Mitra — application received","Hello "+name+",\nYour request has been successfully submitted. Your application is currently under review.\nReference: "+id+"\nApproval does not imply professional credential verification.");
        return Map.of("id",id,"status","pending","message","Application submitted. Your acknowledgment email is queued.");
    }
    public List<Map<String,Object>> list(){return db.query("SELECT document FROM provider_applications ORDER BY submitted_at DESC",(r,n)->store.decode(r.getString(1)));}
    @Transactional public Map<String,Object> review(String id,String decision,String reason,String admin){
        if(!Set.of("approved","rejected").contains(decision)||reason==null||reason.trim().length()<5||reason.length()>1000)throw invalid("Enter a reason or activation instructions (5–1000 characters)");
        var rows=db.query("SELECT document FROM provider_applications WHERE id=? FOR UPDATE",(r,n)->store.decode(r.getString(1)),id);
        if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Application not found");
        var app=rows.get(0);if(!"pending".equals(app.get("status")))throw new ResponseStatusException(HttpStatus.CONFLICT,"This application has already been reviewed");
        app.put("status",decision);app.put("reviewReason",reason.trim());app.put("reviewedBy",admin);app.put("reviewedAt",System.currentTimeMillis());
        if(decision.equals("approved")){
            String provider="p-"+UUID.randomUUID(),account=UUID.randomUUID().toString();
            var profile=new LinkedHashMap<String,Object>();profile.put("id",provider);profile.put("name",app.get("name"));profile.put("organization",app.get("organization"));profile.put("type",app.get("designation"));profile.put("village",app.get("village"));profile.put("phone",app.get("phone"));profile.put("slots",List.of());profile.put("fee",0);profile.put("services","");profile.put("open",false);profile.put("verificationStatus","unverified");
            store.create(provider,"providers",profile);accounts.create(account,(String)app.get("username"),(String)app.get("email"),null,"provider",provider,(String)app.get("name"),false);
            app.put("providerId",provider);activation.issue(account,(String)app.get("email"),"Your application has been approved.\n"+reason.trim());
        }else notifications.queue((String)app.get("email"),"Arogya Mitra — application decision","Your application was not approved.\nReason: "+reason.trim()+"\nReference: "+id);
        db.update("UPDATE provider_applications SET status=?,document=? WHERE id=?",decision,store.encode(app),id);
        db.update("INSERT INTO audit_events(id,actor_id,action,resource_id,detail,created_at) VALUES(?,?,?,?,?,?)",UUID.randomUUID().toString(),admin,"application."+decision,id,reason.trim(),System.currentTimeMillis());
        return app;
    }
}
