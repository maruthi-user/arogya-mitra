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
public class ProviderApplicationService implements org.springframework.boot.ApplicationRunner {
    private final in.arogyamitra.reference.ReferenceCatalog reference;
    private final JdbcTemplate db;private final CatalogRepository store;private final AccountRepository accounts;
    private final org.springframework.security.crypto.password.PasswordEncoder passwords;private final PlatformAccountBridge bridge;private final java.security.SecureRandom random=new java.security.SecureRandom();
    @org.springframework.beans.factory.annotation.Value("${app.frontend-url:http://localhost:3000}") private String frontend;
    private final ApplicationDocuments documents;private final NotificationService notifications;
    public ProviderApplicationService(JdbcTemplate db,CatalogRepository store,AccountRepository accounts,NotificationService notifications,ApplicationDocuments documents,in.arogyamitra.reference.ReferenceCatalog reference,org.springframework.security.crypto.password.PasswordEncoder passwords,PlatformAccountBridge bridge){this.passwords=passwords;this.bridge=bridge;this.reference=reference;this.documents=documents;this.db=db;this.store=store;this.accounts=accounts;this.notifications=notifications;}
    @Override @Transactional public void run(org.springframework.boot.ApplicationArguments ignored){
        for(String account:db.query("SELECT id FROM accounts WHERE registration_status='pending' AND role='provider'",(r,n)->r.getString(1))){
            var rows=db.queryForList("SELECT * FROM accounts WHERE id=? FOR UPDATE",account);if(rows.isEmpty())continue;var a=rows.get(0);
            if(db.queryForObject("SELECT COUNT(*) FROM provider_applications WHERE email=?",Integer.class,a.get("email"))>0)continue;
            var businesses=db.query("SELECT document FROM provider_business_profiles WHERE provider_id=?",(r,n)->store.decode(r.getString(1)),a.get("subject_id"));if(businesses.isEmpty())continue;var business=businesses.get(0);
            String id=UUID.randomUUID().toString();var app=new LinkedHashMap<String,Object>();app.put("id",id);app.put("accountId",account);app.put("providerId",a.get("subject_id"));app.put("name",a.get("display_name"));app.put("username",a.get("username"));app.put("email",a.get("email"));app.put("phone",business.getOrDefault("phone",""));app.put("status","pending");app.put("submittedAt",a.get("created_at"));app.put("approvalWorkflow",true);for(String key:List.of("termsAcceptedAt","termsVersion"))if(business.containsKey(key))app.put(key,business.get(key));
            db.update("INSERT INTO provider_applications(id,username,email,status,document,submitted_at) VALUES(?,?,?,'pending',?,?)",id,a.get("username"),a.get("email"),store.encode(app),a.get("created_at"));
        }
    }
    private String field(Map<String,Object> input,String key,int max){String v=text(input,key).trim();if(v.length()>max)throw invalid("Invalid "+key);return v;}
    @Transactional public Map<String,Object> submit(Map<String,Object> input){
        if(!input.containsKey("organization"))return createAccount(input);
        String name=field(input,"name",80),email=field(input,"email",100).toLowerCase(Locale.ROOT);
        String phone=field(input,"phone",20).replaceAll("[\\s-]",""),organization=field(input,"organization",100),designation=field(input,"designation",20),village=field(input,"village",30);
        if(!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")||!phone.matches("(?:\\+91)?[6-9]\\d{9}")||!reference.contains("villages",village))throw invalid("Check your username, email, phone, designation and village");
        String businessType=input.getOrDefault("businessType","practitioner").toString();
        if(!reference.contains("businessTypes",businessType))throw invalid("Invalid business type");
        if(Set.of("practitioner","hospital","clinic").contains(businessType)&&!Set.of("mbbs","rmp","ayush").contains(designation))throw invalid("Choose the clinical qualification for a practitioner, hospital or clinic");
        String address=input.getOrDefault("address","").toString().trim();if(address.length()>300)throw invalid("Address is too long");
        if(input.containsKey("businessType")&&(address.length()<5||!(input.get("documents") instanceof List<?> docs)||docs.isEmpty()))throw invalid("Business address and at least one supporting document are required");
        String registration=input.getOrDefault("registrationId","") instanceof String v?v.trim():"";
        if(registration.length()>100)throw invalid("Registration ID is too long");
        var result=createAccount(input);String id=(String)result.get("id");
        var application=db.query("SELECT document FROM provider_applications WHERE id=?",(r,n)->store.decode(r.getString(1)),id).get(0);
        application.put("organization",organization);application.put("designation",designation);application.put("village",village);application.put("businessType",businessType);application.put("address",address);application.put("registrationId",registration);application.put("businessReviewIncluded",true);
        db.update("UPDATE provider_applications SET document=? WHERE id=?",store.encode(application),id);documents.save(id,input.get("documents"));
        String provider=(String)application.get("providerId");var profile=store.lockEntity(provider);
        profile.put("organization",organization);profile.put("businessType",businessType);profile.put("address",address);profile.put("village",village);profile.put("type",Set.of("practitioner","hospital","clinic").contains(businessType)?designation:businessType);store.save(provider,profile);
        var business=db.query("SELECT document FROM provider_business_profiles WHERE provider_id=?",(r,n)->store.decode(r.getString(1)),provider).get(0);for(String key:List.of("organization","designation","village","businessType","address","registrationId"))business.put(key,application.get(key));
        db.update("UPDATE provider_business_profiles SET document=? WHERE provider_id=?",store.encode(business),provider);documents.save("business:"+provider,input.get("documents"));return result;
    }

    private Map<String,Object> createAccount(Map<String,Object> input){
        String name=field(input,"name",80),email=field(input,"email",100).toLowerCase(Locale.ROOT);
        String phone=field(input,"phone",20).replaceAll("[\\s-]","");
        if(name.length()<2||!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")||!phone.matches("(?:\\+91)?[6-9]\\d{9}")||!Boolean.TRUE.equals(input.get("termsAccepted")))throw invalid("Enter your name, email, mobile and accept the Terms and Privacy Policy");
        if(accounts.login(email).isPresent()||db.queryForObject("SELECT COUNT(*) FROM provider_applications WHERE email=?",Integer.class,email)>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"An account or application already uses this email");
        String provider="p-"+UUID.randomUUID(),account=UUID.randomUUID().toString();long now=System.currentTimeMillis();
        var profile=new LinkedHashMap<String,Object>();profile.put("id",provider);profile.put("name",name);profile.put("phone",phone);profile.put("organization","");profile.put("businessType","practitioner");profile.put("type","unconfigured");profile.put("village","");profile.put("slots",List.of());profile.put("fee",0);profile.put("services","");profile.put("open",false);profile.put("verificationStatus","unverified");
        store.create(provider,"providers",profile);
        var business=new LinkedHashMap<String,Object>();business.put("providerId",provider);business.put("name",name);business.put("phone",phone);business.put("email",email);business.put("status","draft");business.put("active",true);business.put("termsAcceptedAt",now);business.put("termsVersion","2026-11-03");
        db.update("INSERT INTO provider_business_profiles(provider_id,status,active,document,updated_at) VALUES(?,'draft',TRUE,?,?)",provider,store.encode(business),now);
        String username=generatedUsername(name);
        accounts.create(account,username,email,null,"provider",provider,name,false);
        db.update("UPDATE accounts SET registration_status='pending' WHERE id=?",account);
        String id=UUID.randomUUID().toString();
        var application=new LinkedHashMap<String,Object>();application.put("id",id);application.put("name",name);application.put("username",username);application.put("email",email);application.put("phone",phone);application.put("status","pending");application.put("submittedAt",now);application.put("accountId",account);application.put("providerId",provider);application.put("approvalWorkflow",true);application.put("termsAcceptedAt",now);application.put("termsVersion","2026-11-03");
        db.update("INSERT INTO provider_applications(id,username,email,status,document,submitted_at) VALUES(?,?,?,'pending',?,?)",id,username,email,store.encode(application),now);
        notifications.queue(email,"Arogya Mitra - registration received","Hello "+name+",\nYour provider registration is Pending Approval. You cannot sign in until an administrator approves it.\nUsername: "+username+"\nReference: "+id);
        return Map.of("id",id,"username",username,"status","pending","message","Registration submitted for admin approval. We will email the decision.");
    }
    private String generatedUsername(String name){
        String base=java.text.Normalizer.normalize(name,java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+","-").replaceAll("^-|-$","");
        if(base.length()<3)base="provider-"+Integer.toUnsignedString(name.hashCode(),36);
        if(base.length()>36)base=base.substring(0,36);
        String candidate=base;
        while(accounts.login(candidate).isPresent()||db.queryForObject("SELECT COUNT(*) FROM provider_applications WHERE username=?",Integer.class,candidate)>0||db.queryForObject("SELECT COUNT(*) FROM APP_USERS WHERE LOWER(username)=?",Integer.class,candidate)>0)candidate=base+"-"+UUID.randomUUID().toString().substring(0,8);
        return candidate;
    }
    public List<Map<String,Object>> list(){return db.query("SELECT document FROM provider_applications ORDER BY submitted_at DESC",(r,n)->store.decode(r.getString(1)));}
    @Transactional public Map<String,Object> review(String id,String decision,String reason,String admin){
        if(!Set.of("approved","rejected").contains(decision)||reason==null||reason.length()>1000||(decision.equals("rejected")&&reason.trim().length()<5))throw invalid("Rejection requires a reason (5-1000 characters)");
        var rows=db.query("SELECT document FROM provider_applications WHERE id=? FOR UPDATE",(r,n)->store.decode(r.getString(1)),id);
        if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Application not found");
        var app=rows.get(0);if(!"pending".equals(app.get("status")))throw new ResponseStatusException(HttpStatus.CONFLICT,"This application has already been reviewed");
        app.put("status",decision);app.put("reviewReason",reason.trim());app.put("reviewedBy",admin);app.put("reviewedAt",System.currentTimeMillis());
        if(Boolean.TRUE.equals(app.get("approvalWorkflow"))){
            String account=(String)app.get("accountId");
            if(decision.equals("approved")){
                byte[] bytes=new byte[24];random.nextBytes(bytes);String temporary="AM!9"+Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
                int changed=db.update("UPDATE accounts SET password_hash=?,active=TRUE,registration_status='approved',must_change_password=TRUE,credential_version=credential_version+1 WHERE id=? AND suspended=FALSE",passwords.encode(temporary),account);
                if(changed!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"Account is suspended or no longer available");
                if(Boolean.TRUE.equals(app.get("businessReviewIncluded"))){
                    String provider=(String)app.get("providerId");var business=db.query("SELECT document FROM provider_business_profiles WHERE provider_id=?",(r,n)->store.decode(r.getString(1)),provider).get(0);business.put("status","approved");business.put("reviewReason",reason.trim());
                    db.update("UPDATE provider_business_profiles SET status='approved',document=? WHERE provider_id=?",store.encode(business),provider);
                }
                bridge.sync(account,true);
                notifications.queue((String)app.get("email"),"Arogya Mitra - provider registration approved","Hello "+app.get("name")+",\nYour provider registration has been approved.\nUsername: "+app.get("username")+"\nTemporary password: "+temporary+"\nSign in and change this password before accessing your dashboard.\nSign in: "+frontend+"/auth/login?role=provider\n"+reason.trim());
            }else{
                db.update("UPDATE accounts SET active=FALSE,registration_status='rejected',must_change_password=FALSE,credential_version=credential_version+1 WHERE id=?",account);bridge.sync(account,true);
                notifications.queue((String)app.get("email"),"Arogya Mitra - provider registration rejected","Hello "+app.get("name")+",\nYour provider registration was rejected.\nReason: "+reason.trim()+"\nReference: "+id);
            }
            db.update("UPDATE activation_tokens SET used=TRUE WHERE account_id=?",account);
        }else if(decision.equals("approved")){
            String provider="p-"+UUID.randomUUID(),account=UUID.randomUUID().toString();
            var profile=new LinkedHashMap<String,Object>();profile.put("id",provider);profile.put("name",app.get("name"));profile.put("organization",app.get("organization"));profile.put("businessType",app.getOrDefault("businessType","practitioner"));profile.put("address",app.getOrDefault("address",""));profile.put("type",Set.of("practitioner","hospital","clinic").contains(app.getOrDefault("businessType","practitioner"))?app.get("designation"):app.get("businessType"));profile.put("village",app.get("village"));profile.put("phone",app.get("phone"));profile.put("slots",List.of());profile.put("fee",0);profile.put("services","");profile.put("open",false);profile.put("verificationStatus","unverified");
            byte[] bytes=new byte[24];random.nextBytes(bytes);String temporary="AM!9"+Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            store.create(provider,"providers",profile);accounts.create(account,(String)app.get("username"),(String)app.get("email"),passwords.encode(temporary),"provider",provider,(String)app.get("name"),true);
            db.update("UPDATE accounts SET must_change_password=TRUE WHERE id=?",account);app.put("providerId",provider);app.put("accountId",account);
            notifications.queue((String)app.get("email"),"Arogya Mitra - provider registration approved","Your registration is approved.\nUsername: "+app.get("username")+"\nTemporary password: "+temporary+"\nChange your password at first sign-in.\nSign in: "+frontend+"/auth/login?role=provider");
        }else notifications.queue((String)app.get("email"),"Arogya Mitra — application decision","Your application was not approved.\nReason: "+reason.trim()+"\nReference: "+id);
        db.update("UPDATE provider_applications SET status=?,document=? WHERE id=?",decision,store.encode(app),id);
        db.update("INSERT INTO audit_events(id,actor_id,action,resource_id,detail,created_at) VALUES(?,?,?,?,?,?)",UUID.randomUUID().toString(),admin,"application."+decision,id,reason.trim(),System.currentTimeMillis());
        return app;
    }
}
