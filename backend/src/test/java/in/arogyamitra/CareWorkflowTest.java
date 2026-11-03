package in.arogyamitra;

import com.fasterxml.jackson.databind.*;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.core.io.ClassPathResource;
import java.time.*;
import java.util.*;
import java.util.regex.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import in.arogyamitra.notification.NotificationService;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties={"spring.profiles.active=test","spring.datasource.url=jdbc:h2:mem:careflow;DB_CLOSE_DELAY=-1","app.seed-demo=false","app.notifications.scheduling=false","app.admin.username=test-admin","app.admin.email=admin@example.test","app.admin.password=Test-admin-password-123!"})
@AutoConfigureMockMvc
class CareWorkflowTest {
    @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired JdbcTemplate db;@Autowired NotificationService notifications;
    @MockBean JavaMailSender mail;
    @BeforeEach void isolatedRecords(){
        for(String table:List.of("provider_business_profiles","care_requests","care_services","application_documents","service_requests","bookings","activation_tokens","provider_applications","audit_events","email_outbox"))db.update("DELETE FROM "+table);
        db.update("DELETE FROM USER_SESSIONS");db.update("DELETE FROM PASSWORD_RESET_TOKENS");db.update("DELETE FROM APP_USERS WHERE role<>'ADMIN'");db.update("DELETE FROM accounts WHERE role<>'admin'");db.update("DELETE FROM entities");db.update("DELETE FROM patients");reset(mail);
    }
    static final java.util.concurrent.atomic.AtomicInteger clientIds=new java.util.concurrent.atomic.AtomicInteger();
    class Client {
        final String address="10.0.0."+clientIds.incrementAndGet();
        MockHttpSession session; int lastStatus;
        JsonNode call(String method,String url,Object body,int expected)throws Exception{
            String token=null,header=null;
            if(!method.equals("GET")){
                var csrfRequest=get("/api/auth/csrf");if(session!=null)csrfRequest.session(session);
                var csrfResult=mvc.perform(csrfRequest).andReturn();session=(MockHttpSession)csrfResult.getRequest().getSession(false);
                var csrf=json.readTree(csrfResult.getResponse().getContentAsString());token=csrf.get("token").asText();header=csrf.get("headerName").asText();
            }
            MockHttpServletRequestBuilder request=switch(method){case "GET"->get(url);case "POST"->post(url);case "PATCH"->patch(url);case "PUT"->put(url);default->throw new IllegalArgumentException();};
            request.with(req->{req.setRemoteAddr(address);return req;});if(session!=null)request.session(session);if(token!=null)request.header(header,token);
            if(body!=null)request.contentType("application/json").content(json.writeValueAsString(body));
            var result=mvc.perform(request).andReturn();String response=result.getResponse().getContentAsString();
            lastStatus=result.getResponse().getStatus();if(expected>=0)assertEquals(expected,result.getResponse().getStatus(),method+" "+url+": "+response);
            var next=result.getRequest().getSession(false);session=next instanceof MockHttpSession s?s:null;
            return response.isBlank()?json.createObjectNode():json.readTree(response);
        }
    }
    private Map<String,Object> registration(String suffix){return Map.of("name","Provider "+suffix,"username","provider-"+suffix,"email",suffix+"@example.test","phone","9876543210","organization","Community Clinic","designation","mbbs","village","rama","registrationId","","termsAccepted",true);}
    private String activate(Client client,String email)throws Exception{
        var pending=db.queryForList("SELECT id FROM provider_applications WHERE email=? AND status='pending'",email);
        if(!pending.isEmpty()){var reviewer=new Client();reviewer.call("POST","/api/auth/login",Map.of("username","test-admin","password","Test-admin-password-123!","role","admin"),200);reviewer.call("POST","/api/admin/applications/"+pending.get(0).get("id")+"/review",Map.of("decision","approved","reason","Provider registration reviewed"),200);}
        var messages=db.query("SELECT body FROM email_outbox WHERE recipient=? AND subject LIKE '%registration approved%' ORDER BY updated_at DESC",(r,n)->r.getString(1),email);
        if(!messages.isEmpty()&&Boolean.TRUE.equals(db.queryForObject("SELECT must_change_password FROM accounts WHERE email=?",Boolean.class,email))){
            var nameMatch=Pattern.compile("Username: (.+)").matcher(messages.get(0));var passwordMatch=Pattern.compile("Temporary password: (.+)").matcher(messages.get(0));assertTrue(nameMatch.find());assertTrue(passwordMatch.find());
            String temporary=passwordMatch.group(1).trim();assertTrue(client.call("POST","/api/auth/login",Map.of("username",nameMatch.group(1).trim(),"password",temporary,"role","provider"),200).get("mustChangePassword").asBoolean());
            client.call("GET","/api/state",null,403);client.call("POST","/api/auth/change-initial-password",Map.of("currentPassword",temporary,"newPassword","Provider-password-123!"),200);
            return temporary;
        }

        String body=db.queryForObject("SELECT body FROM email_outbox WHERE recipient=? AND subject LIKE '%account access%' ORDER BY updated_at DESC LIMIT 1",String.class,email);
        var match=Pattern.compile("#activate=([A-Za-z0-9_-]+)").matcher(body);assertTrue(match.find());String token=match.group(1);
        client.call("POST","/api/auth/activate",Map.of("token",token,"password","Provider-password-123!"),200);
        client.call("POST","/api/auth/activate",Map.of("token",token,"password","Provider-password-123!"),400);return token;
    }
    private Client admin()throws Exception{var a=new Client();a.call("POST","/api/auth/login",Map.of("username","test-admin","password","Test-admin-password-123!","role","admin"),200);return a;}
    private Client patient(String name)throws Exception{var p=new Client();String id=p.call("POST","/api/auth/guest",Map.of("language","en"),200).get("subjectId").asText();p.call("PATCH","/api/patients/"+id,Map.of("name",name,"phone","9876543210","village","town"),200);return p;}
    private Map<String,Object> application(String suffix,String business){var input=new HashMap<>(registration(suffix));input.put("businessType",business);input.put("village","town");input.put("address","Main road, nearby town");input.put("documents",List.of(Map.of("name","registration.pdf","type","application/pdf","content",Base64.getEncoder().encodeToString("%PDF-1.4\nTest evidence".getBytes()))));return input;}
    private String approve(Client admin,String suffix,String business)throws Exception{var applicant=new Client();String id=applicant.call("POST","/api/auth/register",application(suffix,business),201).get("id").asText();String provider=admin.call("POST","/api/admin/applications/"+id+"/review",Map.of("decision","approved","reason","Application and submitted document reviewed."),200).get("providerId").asText();activate(applicant,suffix+"@example.test");return provider;}
    private Client provider(String suffix)throws Exception{var p=new Client();p.call("POST","/api/auth/login",Map.of("username","provider-"+suffix,"password","Provider-password-123!","role","provider"),200);return p;}
    private Map<String,Object> service(String kind,String resource,int capacity){var s=new HashMap<String,Object>();s.put("kind",kind);s.put("title",kind+" service");s.put("titleTe","à°†à°°à±‹à°—à±à°¯ à°¸à±‡à°µ");s.put("description","Provider-reviewed service request");s.put("fee",250);s.put("resource",resource);s.put("capacity",capacity);s.put("coverage",List.of("town","rama"));s.put("slots",List.of("09:00","10:00"));s.put("active",true);s.put("available",true);return s;}
    private String publish(Client provider,Client admin,String kind,String resource,int capacity)throws Exception{String id=provider.call("POST","/api/care/services",service(kind,resource,capacity),201).get("id").asText();admin.call("POST","/api/care/services/"+id+"/review",Map.of("decision","approved","reason","Service details and coverage reviewed."),200);return id;}
    private Map<String,Object> request(String service){return Map.of("serviceId",service,"date",LocalDate.now(ZoneId.of("Asia/Kolkata")).plusDays(1).toString(),"time","09:00","village","town","mode","visit","address","House 4, main road","details","Requested service for provider review");}
    @Test void allBusinessWorkflowsRequireApprovalAcceptanceAndProtectDocuments()throws Exception{
        var admin=admin();var anonymous=new Client();var patient=patient("Patient one");var other=patient("Patient two");
        for(var entry:Map.of("practitioner",List.of("home_visit","checkup"),"hospital",List.of("op"),"clinic",List.of("op"),"pharmacy",List.of("medicine","delivery"),"laboratory",List.of("lab"),"ambulance",List.of("ambulance")).entrySet()){
            String business=entry.getKey(),org=approve(admin,business,business);var owner=provider(business);
            for(String kind:entry.getValue()){
                String id=owner.call("POST","/api/care/services",service(kind,kind,1),201).get("id").asText();
                assertFalse(anonymous.call("GET","/api/care/services",null,200).toString().contains(id));
                patient.call("POST","/api/care/requests",request(id),409);
                owner.call("POST","/api/care/services/"+id+"/review",Map.of("decision","approved","reason","Forged review"),403);
                admin.call("POST","/api/care/services/"+id+"/review",Map.of("decision","approved","reason","Service and documents reviewed"),200);
                assertTrue(anonymous.call("GET","/api/care/services?village=town&kind="+kind,null,200).toString().contains(id));
                var available=anonymous.call("GET","/api/care/services/"+id+"/availability?date="+request(id).get("date"),null,200);assertFalse(available.toString().contains("patient"));
                String rid=patient.call("POST","/api/care/requests",request(id),201).get("id").asText();
                patient.call("POST","/api/care/requests",request(id),409);other.call("POST","/api/care/requests",request(id),409);
                other.call("PATCH","/api/care/requests/"+rid,Map.of("status","cancelled","note","Forged cancellation"),403);
                patient.call("PATCH","/api/care/requests/"+rid,Map.of("status","accepted","note",""),409);
                admin.call("PATCH","/api/care/requests/"+rid,Map.of("status","accepted","note",""),409);
                owner.call("PATCH","/api/care/requests/"+rid,Map.of("status","completed","note",""),409);
                assertEquals("accepted",owner.call("PATCH","/api/care/requests/"+rid,Map.of("status","accepted","note",""),200).get("status").asText());
                owner.call("PATCH","/api/care/requests/"+rid,Map.of("status","in_progress","note",""),409);
                owner.call("PATCH","/api/care/services/"+id,service(kind,kind,1),409);
                // Advance only this test fixture's scheduled date to exercise fulfilment transitions.
                String document=db.queryForObject("SELECT document FROM care_requests WHERE id=?",String.class,rid);var record=json.readTree(document);((com.fasterxml.jackson.databind.node.ObjectNode)record).put("date",LocalDate.now().minusDays(1).toString());db.update("UPDATE care_requests SET document=? WHERE id=?",json.writeValueAsString(record),rid);
                owner.call("PATCH","/api/care/requests/"+rid,Map.of("status","in_progress","note",""),200);
                owner.call("PATCH","/api/care/requests/"+rid,Map.of("status","completed","note","Service provided"),200);
                owner.call("PATCH","/api/care/requests/"+rid,Map.of("status","accepted","note",""),409);
            }
            var apps=admin.call("GET","/api/admin/applications",null,200);String appId="";for(var app:apps)if(app.get("providerId").asText().equals(org))appId=app.get("id").asText();
            var docs=admin.call("GET","/api/admin/applications/"+appId+"/documents",null,200);assertEquals(1,docs.size());String doc=docs.get(0).get("id").asText();
            anonymous.call("GET","/api/admin/documents/"+doc,null,401);owner.call("GET","/api/admin/documents/"+doc,null,403);
            var download=mvc.perform(get("/api/admin/documents/"+doc).session(admin.session)).andReturn();assertEquals(200,download.getResponse().getStatus());assertEquals("no-store",download.getResponse().getHeader("Cache-Control"));assertTrue(download.getResponse().getHeader("Content-Disposition").startsWith("attachment"));
        }
        assertEquals(0,other.call("GET","/api/care/requests",null,200).size());assertTrue(admin.call("GET","/api/care/requests",null,200).size()>=7);
        anonymous.call("GET","/api/care/services?managed=true",null,401);anonymous.call("GET","/api/care/requests",null,401);
    }
    @Test void staffIsolationSuspensionExpirySharedResourcesAndLegacyConflicts()throws Exception{
        var admin=admin();String org=approve(admin,"owner","practitioner"),otherOrg=approve(admin,"outsider","practitioner");var owner=provider("owner");var outsider=provider("outsider");var p=patient("Patient");
        String service=publish(owner,admin,"home_visit","doctor",1),sibling=publish(owner,admin,"op","doctor",1);
        outsider.call("PATCH","/api/care/services/"+service,service("home_visit","doctor",1),403);
        String rid=p.call("POST","/api/care/requests",request(service),201).get("id").asText();
        p.call("POST","/api/care/requests",request(sibling),409);
        outsider.call("PATCH","/api/care/requests/"+rid,Map.of("status","accepted","note",""),403);assertEquals(0,outsider.call("GET","/api/care/requests",null,200).size());
        owner.call("PATCH","/api/providers/"+org+"/profile",Map.of("slots",List.of("09:00"),"fee",100,"services","Consultation"),200);
        p.call("POST","/api/bookings",Map.of("pid",org,"date",request(service).get("date"),"time","09:00","reason","Consultation"),409);
        db.update("UPDATE care_requests SET expires_at=0 WHERE id=?",rid);owner.call("PATCH","/api/care/requests/"+rid,Map.of("status","accepted","note",""),409);
        String legacy=p.call("POST","/api/bookings",Map.of("pid",org,"date",request(service).get("date"),"time","09:00","reason","Consultation"),201).get("id").asText();p.call("POST","/api/care/requests",request(service),409);p.call("POST","/api/bookings/"+legacy+"/cancel",Map.of(),200);
        admin.call("POST","/api/care/staff",Map.of("providerId",org,"username","staff-member","email","staff@example.test","name","Staff Member"),201);activate(new Client(),"staff@example.test");var staff=new Client();staff.call("POST","/api/auth/login",Map.of("username","staff-member","password","Provider-password-123!","role","provider"),200);
        assertEquals(2,staff.call("GET","/api/care/services?managed=true",null,200).size());staff.call("PATCH","/api/providers/"+otherOrg+"/open",Map.of("open",true),403);
        String activeRequest=p.call("POST","/api/care/requests",request(service),201).get("id").asText();staff.call("PATCH","/api/care/requests/"+activeRequest,Map.of("status","accepted","note",""),200);
        admin.call("PATCH","/api/care/organisations/"+org,Map.of("suspended",true,"reason","Suspended pending further document review"),200);
        assertEquals(0,new Client().call("GET","/api/care/services",null,200).size());assertEquals("anonymous",staff.call("GET","/api/auth/session",null,200).get("role").asText());assertEquals("anonymous",owner.call("GET","/api/auth/session",null,200).get("role").asText());
        var suspended=providerAttempt("owner",401);suspended.call("POST","/api/auth/request-setup",Map.of("email","owner@example.test"),200);assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM activation_tokens WHERE used=FALSE",Integer.class));
        admin.call("PATCH","/api/care/organisations/"+org,Map.of("suspended",false,"reason","Review completed; resume service"),200);provider("owner");
        p.call("PATCH","/api/care/requests/"+activeRequest,Map.of("status","cancelled","note","Patient no longer needs service"),200);
    }
    private Client providerAttempt(String suffix,int status)throws Exception{var c=new Client();c.call("POST","/api/auth/login",Map.of("username","provider-"+suffix,"password","Provider-password-123!","role","provider"),status);return c;}
    @Test void simultaneousRequestsCannotExceedCapacityAndInvalidDocumentsRollback()throws Exception{
        var admin=admin();approve(admin,"capacity","laboratory");var owner=provider("capacity");String service=publish(owner,admin,"lab","counter",1);var p=patient("First");var q=patient("Second");
        try(var pool=new AutoCloseableExecutor()){
            var latch=new java.util.concurrent.CountDownLatch(1);var a=pool.executor.submit(()->{latch.await();p.call("POST","/api/care/requests",request(service),-1);return p.lastStatus;});var b=pool.executor.submit(()->{latch.await();q.call("POST","/api/care/requests",request(service),-1);return q.lastStatus;});latch.countDown();var results=new ArrayList<>(List.of(a.get(),b.get()));Collections.sort(results);assertEquals(List.of(201,409),results);
        }
        var bad=application("invalid","pharmacy");bad.put("documents",List.of(Map.of("name","evidence.pdf","type","application/pdf","content",Base64.getEncoder().encodeToString("<script>bad</script>".getBytes()))));new Client().call("POST","/api/auth/register",bad,400);assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM provider_applications WHERE username='provider-invalid'",Integer.class));
        owner.call("POST","/api/care/services",service("delivery","counter",1),400);owner.call("POST","/api/care/services",service("lab","counter",2),400);
        var invalid=service("lab","room",1);invalid.put("slots",List.of("25:00"));owner.call("POST","/api/care/services",invalid,400);
    }
    @Test void overlappingDurationsPauseAndSchemaUpgradePreserveRecords()throws Exception{
        var admin=admin();String org=approve(admin,"duration","practitioner");var owner=provider("duration");var p=patient("One");var q=patient("Two");
        var definition=service("home_visit","team",1);definition.put("durationMinutes",60);definition.put("slots",List.of("09:00","09:30","10:00"));String id=owner.call("POST","/api/care/services",definition,201).get("id").asText();admin.call("POST","/api/care/services/"+id+"/review",Map.of("decision","approved","reason","Duration and coverage reviewed"),200);
        String request=p.call("POST","/api/care/requests",request(id),201).get("id").asText();var overlap=new HashMap<>(request(id));overlap.put("time","09:30");q.call("POST","/api/care/requests",overlap,409);overlap.put("time","10:00");String next=q.call("POST","/api/care/requests",overlap,201).get("id").asText();
        owner.call("PATCH","/api/care/services/"+id+"/availability",Map.of("available",false,"active",true),200);overlap.put("time","10:00");p.call("POST","/api/care/requests",overlap,409);owner.call("PATCH","/api/care/requests/"+request,Map.of("status","accepted","note",""),200);
        // Re-running the additive startup schema must retain the application and requests.
        String before=db.queryForObject("SELECT document FROM care_requests WHERE id=?",String.class,request);
        try(var connection=Objects.requireNonNull(db.getDataSource()).getConnection()){ScriptUtils.executeSqlScript(connection,new ClassPathResource("schema.sql"));}
        assertEquals(before,db.queryForObject("SELECT document FROM care_requests WHERE id=?",String.class,request));assertEquals(2,db.queryForObject("SELECT COUNT(*) FROM care_requests",Integer.class));assertTrue(new Client().call("GET","/api/care/services",null,200).toString().contains(id));
        p.call("PATCH","/api/care/requests/"+request,Map.of("status","cancelled","note","Plans changed; cancel request"),200);q.call("PATCH","/api/care/requests/"+next,Map.of("status","cancelled","note","Plans changed; cancel request"),200);
        definition.put("slots",List.of("23:30"));definition.put("durationMinutes",60);owner.call("POST","/api/care/services",definition,400);
    }
    @Test void referenceCatalogIsReadFromDatabaseAndUsedForValidation()throws Exception{
        db.update("INSERT INTO reference_catalog(category,ref_id,document,display_order,active) VALUES('villages','lake',?,99,TRUE)","{\"id\":\"lake\",\"en\":\"Lake Town\",\"te\":\"Lake Town\"}");
        db.update("INSERT INTO reference_catalog(category,ref_id,document,display_order,active) VALUES('medicines','vitamin',?,99,TRUE)","{\"id\":\"vitamin\",\"en\":\"Vitamin\",\"te\":\"Vitamin\",\"kw\":[],\"icon\":\"+\",\"rx\":false}");
        try{
            var anonymous=new Client();String metadata=anonymous.call("GET","/api/reference-data",null,200).toString();assertTrue(metadata.contains("Lake Town"));assertTrue(metadata.contains("Vitamin"));
            var profile=registration("db-catalog");var input=new HashMap<>(profile);input.put("village","lake");anonymous.call("POST","/api/auth/register",input,201);
            var admin=admin();String pharmacy=admin.call("POST","/api/admin/pharmacies",Map.of("name","Lake Pharmacy","phone","9876543210","village","lake"),201).get("id").asText();
            var p=patient("Lookup patient");String patient=p.call("GET","/api/auth/session",null,200).get("subjectId").asText();p.call("PATCH","/api/patients/"+patient,Map.of("village","lake"),200);p.call("POST","/api/medicine-requests",Map.of("pharmacyId",pharmacy,"medicineId","vitamin","message","Availability inquiry"),201);
            db.update("UPDATE reference_catalog SET active=FALSE WHERE category='villages' AND ref_id='lake'");assertFalse(anonymous.call("GET","/api/reference-data",null,200).toString().contains("Lake Town"));p.call("PATCH","/api/patients/"+patient,Map.of("village","lake"),400);
        }finally{db.update("DELETE FROM reference_catalog WHERE ref_id IN ('lake','vitamin')");}
    }
    @Test void optionalFeesAndOrganisationInvitationsStayScoped()throws Exception{
        var admin=admin();String org=approve(admin,"invite-owner","laboratory"),other=approve(admin,"invite-other","laboratory");var owner=provider("invite-owner");
        var definition=service("lab","counter",1);definition.remove("fee");var saved=owner.call("POST","/api/care/services",definition,201);assertTrue(saved.get("feeOnRequest").asBoolean());assertEquals("pending",saved.get("approval").asText());assertEquals(0,new Client().call("GET","/api/care/services",null,200).size());
        owner.call("POST","/api/care/staff",Map.of("providerId",other,"username","wrong-staff","email","wrong@example.test","name","Wrong"),403);
        owner.call("POST","/api/care/staff",Map.of("providerId",org,"username","local-staff","email","local@example.test","name","Local Staff"),201);
        String users=owner.call("GET","/api/care/staff",null,200).toString();assertTrue(users.contains("local-staff"));assertFalse(users.contains("invite-other"));assertFalse(users.contains("password"));
        patient("No access").call("GET","/api/care/staff",null,403);
    }

    @Test void verifiedAccountOnboardsWithDraftsReviewsAndResubmission()throws Exception{
        var owner=new Client();var admin=admin();var publicUser=new Client();
        owner.call("POST","/api/auth/register",Map.of("name","New Provider","email","new-owner@example.test","phone","9876543210","termsAccepted",false),400);
        owner.call("POST","/api/auth/register",Map.of("name","New Provider","email","new-owner@example.test","phone","9876543210","termsAccepted",true),201);
        owner.call("POST","/api/auth/login",Map.of("username","new-owner@example.test","password","Provider-password-123!","role","provider"),401);
        activate(owner,"new-owner@example.test");
        String id=owner.call("POST","/api/auth/login",Map.of("username","new-owner@example.test","password","Provider-password-123!","role","provider"),200).get("subjectId").asText();
        assertEquals("draft",owner.call("GET","/api/onboarding/businesses/"+id,null,200).get("status").asText());
        publicUser.call("GET","/api/onboarding/businesses/"+id,null,401);
        var stranger=new Client();stranger.call("POST","/api/auth/register",Map.of("name","Other Provider","email","other-new@example.test","phone","9876543211","termsAccepted",true),201);activate(stranger,"other-new@example.test");stranger.call("POST","/api/auth/login",Map.of("username","other-new@example.test","password","Provider-password-123!","role","provider"),200);
        stranger.call("GET","/api/onboarding/businesses/"+id,null,403);
        owner.call("POST","/api/onboarding/businesses/"+id+"/submit",Map.of(),400);
        var business=new HashMap<String,Object>();business.put("businessType","clinic");business.put("organization","New Clinic");business.put("address","Main road number 12");business.put("village","town");business.put("designation","mbbs");business.put("registrationId","CLINIC-123");business.put("active",true);business.put("documents",List.of(Map.of("name","license.pdf","type","application/pdf","content",Base64.getEncoder().encodeToString("%PDF-1.4\nLicense evidence".getBytes()))));
        var saved=owner.call("PUT","/api/onboarding/businesses/"+id,business,200);String file=saved.get("documents").get(0).get("id").asText();
        stranger.call("GET","/api/onboarding/businesses/"+id+"/documents/"+file,null,403);
        var definition=service("home_visit","doctor-1",1);definition.put("draft",true);definition.put("coverage",List.of());definition.put("slots",List.of());
        String serviceId=owner.call("POST","/api/care/services",definition,201).get("id").asText();
        admin.call("POST","/api/care/services/"+serviceId+"/review",Map.of("decision","approved","reason","Not ready for review"),409);
        assertEquals(0,publicUser.call("GET","/api/care/services",null,200).size());
        definition.put("draft",false);definition.put("coverage",List.of("town"));definition.put("slots",List.of("09:00"));definition.put("travelFee",50);definition.put("availableDays",List.of(1,2,3,4,5,6,7));definition.put("deliveryMode","home");
        owner.call("PATCH","/api/care/services/"+serviceId,definition,200);
        stranger.call("PATCH","/api/care/services/"+serviceId,definition,403);
        owner.call("POST","/api/onboarding/businesses/"+id+"/submit",Map.of(),200);
        owner.call("POST","/api/onboarding/businesses/"+id+"/review",Map.of("decision","approved","reason","Self approval is prohibited"),403);
        admin.call("POST","/api/onboarding/businesses/"+id+"/review",Map.of("decision","rejected","reason","Please correct business address"),200);
        business.remove("documents");business.put("address","Corrected road number 12");owner.call("PUT","/api/onboarding/businesses/"+id,business,200);
        owner.call("POST","/api/onboarding/businesses/"+id+"/submit",Map.of(),200);
        admin.call("POST","/api/care/services/"+serviceId+"/review",Map.of("decision","approved","reason","Service evidence reviewed"),200);
        assertEquals(0,publicUser.call("GET","/api/care/services",null,200).size());
        admin.call("POST","/api/onboarding/businesses/"+id+"/review",Map.of("decision","approved","reason","Business evidence reviewed"),200);
        assertEquals(1,publicUser.call("GET","/api/care/services",null,200).size());
        var patient=patient("New patient");var requested=patient.call("POST","/api/care/requests",request(serviceId),201);assertEquals(300,requested.get("fee").asInt());
        patient.call("PATCH","/api/care/requests/"+requested.get("id").asText(),Map.of("status","cancelled","note","No longer required"),200);
        business.put("active",false);owner.call("PUT","/api/onboarding/businesses/"+id,business,200);
        assertEquals(0,publicUser.call("GET","/api/care/services",null,200).size());
        patient.call("POST","/api/care/requests",request(serviceId),409);
        assertFalse(owner.call("GET","/api/onboarding/notifications",null,200).isEmpty());
    }

    @Test void addServiceTimeWindowAndPractitionerAreValidatedAndPersisted()throws Exception{
        var admin=admin();String org=approve(admin,"window-owner","clinic"),other=approve(admin,"window-other","clinic");
        var owner=provider("window-owner");var stranger=provider("window-other");
        var staff=owner.call("GET","/api/care/staff",null,200);String assigned=staff.get(0).get("id").asText();assertEquals(org,staff.get(0).get("providerId").asText());
        String foreign=stranger.call("GET","/api/care/staff",null,200).get(0).get("id").asText();
        var input=service("home_visit","ignored",1);input.put("fee",300);input.put("travelFee",50);input.put("practitionerId",assigned);input.put("practitionerName","Forged name");input.put("timeWindow",Map.of("start","09:00","end","10:00"));input.put("slots",List.of("23:30"));input.put("titleTe","");
        String day=LocalDate.now(ZoneId.of("Asia/Kolkata")).plusDays(1).toString();input.put("availableDays",List.of(LocalDate.parse(day).getDayOfWeek().getValue()));
        var saved=owner.call("POST","/api/care/services",input,201);String id=saved.get("id").asText();
        assertEquals("09:00",saved.get("slots").get(0).asText());assertEquals("09:30",saved.get("slots").get(1).asText());assertEquals(2,saved.get("slots").size());assertEquals(350,saved.get("totalFee").asInt());assertEquals("10:00",saved.get("timeWindow").get("end").asText());assertNotEquals("Forged name",saved.get("practitionerName").asText());assertEquals("practitioner:"+assigned,saved.get("resource").asText());assertEquals(saved.get("title").asText(),saved.get("titleTe").asText());
        input.put("practitionerId",foreign);owner.call("PATCH","/api/care/services/"+id,input,400);input.put("practitionerId",assigned);
        input.put("timeWindow",Map.of("start","18:00","end","09:00"));owner.call("PATCH","/api/care/services/"+id,input,400);
        input.put("timeWindow",Map.of("start","09:00","end","09:15"));owner.call("PATCH","/api/care/services/"+id,input,400);
        input.put("timeWindow",Map.of("start","25:00","end","26:00"));owner.call("PATCH","/api/care/services/"+id,input,400);
        input.put("durationMinutes",15);input.put("timeWindow",Map.of("start","00:00","end","23:59"));owner.call("PATCH","/api/care/services/"+id,input,400);
        stranger.call("PATCH","/api/care/services/"+id,input,403);
        admin.call("POST","/api/care/services/"+id+"/review",Map.of("decision","approved","reason","Assigned practitioner and schedule reviewed"),200);
        var patient=patient("Window patient");assertEquals(2,patient.call("GET","/api/care/services/"+id+"/availability?date="+day,null,200).get("slots").size());
        var request=new HashMap<>(request(id));request.put("time","10:00");patient.call("POST","/api/care/requests",request,400);request.put("time","09:30");var booking=patient.call("POST","/api/care/requests",request,201);assertEquals(assigned,booking.get("practitionerId").asText());assertEquals(350,booking.get("fee").asInt());
    }
    static class AutoCloseableExecutor implements AutoCloseable {final java.util.concurrent.ExecutorService executor=java.util.concurrent.Executors.newFixedThreadPool(2);public void close(){executor.shutdownNow();}}
}

