package in.arogyamitra;

import com.fasterxml.jackson.databind.*;
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

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:secureflow;DB_CLOSE_DELAY=-1","app.seed-demo=false","app.notifications.scheduling=false","app.admin.username=test-admin","app.admin.email=admin@example.test","app.admin.password=Test-admin-password-123!"})
@AutoConfigureMockMvc
class SecureWorkflowTest {
    @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired JdbcTemplate db;@Autowired NotificationService notifications;
    @MockBean JavaMailSender mail;
    @BeforeEach void isolatedRecords(){
        for(String table:List.of("service_requests","bookings","activation_tokens","provider_applications","audit_events","email_outbox"))db.update("DELETE FROM "+table);
        db.update("DELETE FROM accounts WHERE role<>'admin'");db.update("DELETE FROM entities");db.update("DELETE FROM patients");reset(mail);
    }
    class Client {
        MockHttpSession session;
        JsonNode call(String method,String url,Object body,int expected)throws Exception{
            String token=null,header=null;
            if(!method.equals("GET")){
                var csrfRequest=get("/api/auth/csrf");if(session!=null)csrfRequest.session(session);
                var csrfResult=mvc.perform(csrfRequest).andReturn();session=(MockHttpSession)csrfResult.getRequest().getSession(false);
                var csrf=json.readTree(csrfResult.getResponse().getContentAsString());token=csrf.get("token").asText();header=csrf.get("headerName").asText();
            }
            MockHttpServletRequestBuilder request=switch(method){case "GET"->get(url);case "POST"->post(url);case "PATCH"->patch(url);default->throw new IllegalArgumentException();};
            if(session!=null)request.session(session);if(token!=null)request.header(header,token);
            if(body!=null)request.contentType("application/json").content(json.writeValueAsString(body));
            var result=mvc.perform(request).andReturn();String response=result.getResponse().getContentAsString();
            assertEquals(expected,result.getResponse().getStatus(),method+" "+url+": "+response);
            var next=result.getRequest().getSession(false);session=next instanceof MockHttpSession s?s:null;
            return response.isBlank()?json.createObjectNode():json.readTree(response);
        }
    }
    private Map<String,Object> registration(String suffix){return Map.of("name","Provider "+suffix,"username","provider-"+suffix,"email",suffix+"@example.test","phone","9876543210","organization","Community Clinic","designation","mbbs","village","rama","registrationId","");}
    private String activate(Client client,String email)throws Exception{
        String body=db.queryForObject("SELECT body FROM email_outbox WHERE recipient=? AND subject LIKE '%account access%' ORDER BY updated_at DESC LIMIT 1",String.class,email);
        var match=Pattern.compile("#activate=([A-Za-z0-9_-]+)").matcher(body);assertTrue(match.find());String token=match.group(1);
        client.call("POST","/api/auth/activate",Map.of("token",token,"password","Provider-password-123!"),200);
        client.call("POST","/api/auth/activate",Map.of("token",token,"password","Provider-password-123!"),400);return token;
    }
    @Test void rolesApprovalGuestOwnershipAndNotifications()throws Exception{
        var anonymous=new Client();assertEquals(0,anonymous.call("GET","/api/providers",null,200).size());
        anonymous.call("GET","/api/admin/applications",null,401);
        var noCsrf=mvc.perform(post("/api/auth/guest").contentType("application/json").content("{}" )).andReturn();assertEquals(403,noCsrf.getResponse().getStatus());
        var application=anonymous.call("POST","/api/auth/register",registration("first"),201);String appId=application.get("id").asText();
        anonymous.call("POST","/api/auth/register",registration("first"),409);
        anonymous.call("POST","/api/auth/login",Map.of("username","provider-first","password","Provider-password-123!","role","provider"),401);
        var admin=new Client();admin.call("POST","/api/auth/login",Map.of("username","test-admin","password","Test-admin-password-123!","role","admin"),200);
        admin.call("POST","/api/admin/applications/"+appId+"/review",Map.of("decision","approved","reason",""),400);
        String provider=admin.call("POST","/api/admin/applications/"+appId+"/review",Map.of("decision","approved","reason","Welcome. Set your password and configure your schedule."),200).get("providerId").asText();
        admin.call("POST","/api/admin/applications/"+appId+"/review",Map.of("decision","rejected","reason","Already reviewed"),409);
        assertEquals(0,anonymous.call("GET","/api/providers",null,200).size());
        activate(anonymous,"first@example.test");
        var doctor=new Client();doctor.call("POST","/api/auth/login",Map.of("username","provider-first","password","Provider-password-123!","role","provider"),200);
        doctor.call("PATCH","/api/providers/"+provider+"/profile",Map.of("slots",List.of("10:00","11:00"),"fee",200,"services","General consultation"),200);
        doctor.call("GET","/api/admin/applications",null,403);
        doctor.call("PATCH","/api/providers/not-owned/schedule",Map.of("slots",List.of("10:00")),403);
        var patient=new Client();String patientId=patient.call("POST","/api/auth/guest",Map.of("language","en"),200).get("subjectId").asText();
        patient.call("PATCH","/api/patients/"+patientId,Map.of("name","Guest patient","phone","9876543210","village","rama"),200);
        String date=LocalDate.now(ZoneId.of("Asia/Kolkata")).plusDays(1).toString();
        var input=Map.of("pid",provider,"patientId","forged-patient","date",date,"time","10:00","name","Forged","village","rama","reason","Consultation");
        var booking=patient.call("POST","/api/bookings",input,201);String id=booking.get("id").asText();assertEquals(patientId,booking.get("patientId").asText());assertEquals("Guest patient",booking.get("name").asText());
        patient.call("POST","/api/bookings",input,409);
        var other=new Client();other.call("POST","/api/auth/guest",Map.of(),200);other.call("GET","/api/bookings/"+id,null,403);assertEquals(0,other.call("GET","/api/state",null,200).get("bookings").size());
        assertEquals(0,anonymous.call("GET","/api/state",null,200).get("bookings").size());
        assertEquals("confirmed",doctor.call("POST","/api/bookings/"+id+"/accept",Map.of("providerId","forged"),200).get("status").asText());
        doctor.call("POST","/api/bookings/"+id+"/complete",Map.of(),409);
        patient.call("POST","/api/bookings/"+id+"/cancel",Map.of("actor",Map.of("role","provider","id","fake")),200);
        var rejected=anonymous.call("POST","/api/auth/register",registration("rejected"),201).get("id").asText();
        admin.call("POST","/api/admin/applications/"+rejected+"/review",Map.of("decision","rejected","reason","Please provide your practice location details."),200);
        assertTrue(admin.call("GET","/api/admin/audit",null,200).size()>=2);
        var pharmacy=admin.call("POST","/api/admin/pharmacies",Map.of("name","Community Pharmacy","phone","9876543210","village","rama"),201).get("id").asText();
        patient.call("POST","/api/medicine-requests",Map.of("pharmacyId",pharmacy,"medicineId","para","message","Availability inquiry"),201);
        assertEquals(1,admin.call("GET","/api/medicine-requests",null,200).size());assertEquals(0,other.call("GET","/api/medicine-requests",null,200).size());
        doThrow(new MailSendException("SMTP offline")).when(mail).send(any(SimpleMailMessage.class));notifications.deliver();
        var failed=admin.call("GET","/api/admin/notifications",null,200);assertTrue(failed.size()>=3);assertEquals("failed",failed.get(0).get("status").asText());
        reset(mail);admin.call("POST","/api/admin/notifications/"+failed.get(0).get("id").asText()+"/retry",Map.of(),200);notifications.deliver();verify(mail,atLeastOnce()).send(any(SimpleMailMessage.class));
        doctor.call("POST","/api/auth/logout",Map.of(),200);doctor.call("GET","/api/providers/"+provider+"/bookings",null,401);
    }
    @Test void passwordResetInvalidatesExistingSessionsAndExpiredLinksFail()throws Exception{
        reset(mail);var applicant=new Client();String id=applicant.call("POST","/api/auth/register",registration("reset-case"),201).get("id").asText();
        var admin=new Client();admin.call("POST","/api/auth/login",Map.of("username","test-admin","password","Test-admin-password-123!","role","admin"),200);
        admin.call("POST","/api/admin/applications/"+id+"/review",Map.of("decision","approved","reason","Password reset security test approval"),200);activate(applicant,"reset-case@example.test");
        var provider=new Client();provider.call("POST","/api/auth/login",Map.of("username","provider-reset-case","password","Provider-password-123!","role","provider"),200);
        applicant.call("POST","/api/auth/request-setup",Map.of("email","reset-case@example.test"),200);activate(applicant,"reset-case@example.test");
        assertEquals("anonymous",provider.call("GET","/api/auth/session",null,200).get("role").asText());
        applicant.call("POST","/api/auth/request-setup",Map.of("email","reset-case@example.test"),200);
        String body=db.queryForObject("SELECT body FROM email_outbox WHERE recipient='reset-case@example.test' AND subject LIKE '%account access%' ORDER BY updated_at DESC LIMIT 1",String.class);
        var match=Pattern.compile("#activate=([A-Za-z0-9_-]+)").matcher(body);assertTrue(match.find());db.update("UPDATE activation_tokens SET expires_at=0 WHERE used=FALSE");
        applicant.call("POST","/api/auth/activate",Map.of("token",match.group(1),"password","Provider-password-123!"),400);
    }
}
