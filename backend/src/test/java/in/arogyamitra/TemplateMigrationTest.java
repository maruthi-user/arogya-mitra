package in.arogyamitra;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.*;
import org.springframework.mock.web.MockHttpSession;
import jakarta.servlet.http.Cookie;
import java.util.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(properties={"spring.profiles.active=test","spring.datasource.url=jdbc:h2:mem:templatejwt;DB_CLOSE_DELAY=-1","app.auth.legacy-session-enabled=false","app.notifications.scheduling=false","app.admin.username=jwt-admin","app.admin.email=jwt-admin@example.test","app.admin.password=Jwt-admin-password-123!"})
@AutoConfigureMockMvc
class TemplateMigrationTest {
 @Autowired org.springframework.jdbc.core.JdbcTemplate db;@Autowired in.arogyamitra.auth.AccountRepository accounts;@Autowired org.springframework.security.crypto.password.PasswordEncoder passwords;
 @Autowired in.arogyamitra.registration.ProviderApplicationService applications;
 @Autowired MockMvc mvc;@Autowired ObjectMapper json;
 class Client {
  MockHttpSession session;Map<String,Cookie> cookies=new HashMap<>();
  JsonNode call(String method,String path,Object body,int expected)throws Exception{
   String token=null,header=null;if(!method.equals("GET")){var csrf=call("GET","/api/auth/csrf",null,200);token=csrf.get("token").asText();header=csrf.get("headerName").asText();}
   var request=method.equals("GET")?get(path):method.equals("POST")?post(path):patch(path);if(session!=null)request.session(session);if(!cookies.isEmpty())request.cookie(cookies.values().toArray(Cookie[]::new));if(token!=null)request.header(header,token);if(body!=null)request.contentType("application/json").content(json.writeValueAsString(body));
   var result=mvc.perform(request).andReturn();assertEquals(expected,result.getResponse().getStatus(),method+" "+path+" "+result.getResponse().getContentAsString());session=(MockHttpSession)result.getRequest().getSession(false);for(Cookie c:result.getResponse().getCookies()){if(c.getMaxAge()==0)cookies.remove(c.getName());else cookies.put(c.getName(),c);}String content=result.getResponse().getContentAsString();return content.isBlank()?json.createObjectNode():json.readTree(content);
  }
 }
 @Test void loginReportsCsrfRejectionBeforeCheckingCredentials()throws Exception{
  var first=mvc.perform(get("/api/auth/csrf")).andReturn();var session=(MockHttpSession)first.getRequest().getSession(false);var csrf=json.readTree(first.getResponse().getContentAsString());
  var denied=mvc.perform(post("/api/auth/login").session(session).contentType("application/json").content(json.writeValueAsString(Map.of("username","missing-csrf-test-user","password","Jwt-admin-password-123!","role","admin")))).andReturn();
  assertEquals(403,denied.getResponse().getStatus());assertEquals("CSRF_INVALID",json.readTree(denied.getResponse().getContentAsString()).get("code").asText());
  var accepted=mvc.perform(post("/api/auth/login").session(session).header(csrf.get("headerName").asText(),csrf.get("token").asText()).contentType("application/json").content(json.writeValueAsString(Map.of("username","missing-csrf-test-user","password","Jwt-admin-password-123!","role","admin")))).andReturn();
  assertEquals(401,accepted.getResponse().getStatus());
 }
 @Test void jwtCookiesRefreshDeviceSessionsPasswordChangeAndGuestIsolation()throws Exception{
  var a=new Client();assertEquals("admin",a.call("POST","/api/auth/login",Map.of("username","jwt-admin","password","Jwt-admin-password-123!","role","admin"),200).get("role").asText());assertTrue(a.cookies.get("ACCESS_TOKEN").isHttpOnly());assertTrue(a.cookies.get("REFRESH_TOKEN").isHttpOnly());assertNull(a.session.getAttribute("SPRING_SECURITY_CONTEXT"));assertFalse(a.call("GET","/api/auth/session",null,200).get("accountId").asText().isBlank());
  assertEquals("ADMIN",a.call("GET","/api/v1/auth/me",null,200).get("user").get("role").asText());a.call("GET","/api/admin/applications",null,200);assertEquals(1,a.call("GET","/api/v1/auth/sessions",null,200).size());
  String original=a.cookies.get("ACCESS_TOKEN").getValue();a.call("POST","/api/v1/auth/refresh",Map.of(),200);assertNotNull(a.cookies.get("ACCESS_TOKEN"));
  a.call("POST","/api/v1/auth/change-password",Map.of("currentPassword","Jwt-admin-password-123!","newPassword","Updated-admin-password-123!"),200);
  var b=new Client();b.call("POST","/api/auth/login",Map.of("username","jwt-admin","password","Jwt-admin-password-123!","role","admin"),401);b.call("POST","/api/auth/login",Map.of("username","jwt-admin","password","Updated-admin-password-123!","role","admin"),200);
  b.call("POST","/api/auth/guest",Map.of("language","en"),200);assertFalse(b.cookies.containsKey("ACCESS_TOKEN"));assertEquals("patient",b.call("GET","/api/auth/session",null,200).get("role").asText());b.call("GET","/api/admin/applications",null,403);b.call("GET","/api/v1/auth/me",null,403);
  a.call("POST","/api/auth/logout",Map.of(),200);assertFalse(a.cookies.containsKey("ACCESS_TOKEN"));assertEquals("anonymous",a.call("GET","/api/auth/session",null,200).get("role").asText());
 }

 @Test void providerRegistrationRequiresAdminApprovalAndPasswordChangeAcrossBothApiFamilies()throws Exception{
  accounts.create(UUID.randomUUID().toString(),"approval-admin","approval-admin@example.test",passwords.encode("Approval-admin-123!"),"admin","approval-admin","Approval Admin",true);
  var admin=new Client();admin.call("POST","/api/auth/login",Map.of("username","approval-admin","password","Approval-admin-123!","role","admin"),200);
  var applicant=new Client();var registration=applicant.call("POST","/api/auth/register",Map.of("name","Ravi Kumar","email","approval-ravi@example.test","phone","9876543210","termsAccepted",true,"username","ignored-forged-name"),201);
  String id=registration.get("id").asText(),username=registration.get("username").asText();assertEquals("ravi-kumar",username);assertEquals("pending",registration.get("status").asText());assertFalse(registration.has("password"));
  applicant.call("POST","/api/auth/login",Map.of("username",username,"password","Unknown-password-123!","role","provider"),401);
  applicant.call("POST","/api/v1/auth/login",Map.of("username",username,"password","Unknown-password-123!"),401);
  applicant.call("POST","/api/auth/request-setup",Map.of("email","approval-ravi@example.test"),200);assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM activation_tokens WHERE account_id=(SELECT id FROM accounts WHERE email=?)",Integer.class,"approval-ravi@example.test"));
  assertTrue(admin.call("GET","/api/admin/applications",null,200).toString().contains("approval-ravi@example.test"));
  admin.call("POST","/api/admin/applications/"+id+"/review",Map.of("decision","approved"),200);
  admin.call("POST","/api/admin/applications/"+id+"/review",Map.of("decision","approved"),409);
  String email=db.queryForObject("SELECT body FROM email_outbox WHERE recipient=? AND subject LIKE '%registration approved%'",String.class,"approval-ravi@example.test");
  var match=java.util.regex.Pattern.compile("Temporary password: (.+)").matcher(email);assertTrue(match.find());String temporary=match.group(1).trim();assertTrue(email.contains("Username: "+username));
  assertTrue(passwords.matches(temporary,db.queryForObject("SELECT password_hash FROM accounts WHERE email=?",String.class,"approval-ravi@example.test")));
  assertTrue(applicant.call("POST","/api/auth/login",Map.of("username",username,"password",temporary,"role","provider"),200).get("mustChangePassword").asBoolean());
  assertTrue(applicant.call("GET","/api/auth/session",null,200).get("mustChangePassword").asBoolean());
  assertEquals("PASSWORD_CHANGE_REQUIRED",applicant.call("GET","/api/state",null,403).get("code").asText());
  applicant.call("GET","/api/care/services?managed=true",null,403);applicant.call("GET","/api/v1/auth/me",null,403);applicant.call("POST","/api/v1/auth/change-password",Map.of("currentPassword",temporary,"newPassword","Permanent-provider-123!"),403);
  var alternative=new Client();alternative.call("POST","/api/v1/auth/login",Map.of("username",username,"password",temporary),200);alternative.call("GET","/api/v1/auth/me",null,403);
  applicant.call("POST","/api/auth/change-initial-password",Map.of("currentPassword",temporary,"newPassword",temporary),400);
  applicant.call("POST","/api/auth/change-initial-password",Map.of("currentPassword",temporary,"newPassword","short"),400);
  applicant.call("POST","/api/auth/change-initial-password",Map.of("currentPassword","Incorrect-current-123!","newPassword","Permanent-provider-123!"),400);
  applicant.call("POST","/api/auth/change-initial-password",Map.of("currentPassword",temporary,"newPassword","Permanent-provider-123!"),200);
  alternative.call("GET","/api/v1/auth/me",null,401);
  applicant.call("POST","/api/auth/login",Map.of("username",username,"password",temporary,"role","provider"),401);
  assertFalse(applicant.call("POST","/api/auth/login",Map.of("username",username,"password","Permanent-provider-123!","role","provider"),200).get("mustChangePassword").asBoolean());applicant.call("GET","/api/state",null,200);
  var rejected=new Client();var second=rejected.call("POST","/api/auth/register",Map.of("name","Ravi Kumar","email","approval-rejected@example.test","phone","9876543211","termsAccepted",true),201);assertNotEquals(username,second.get("username").asText());assertTrue(second.get("username").asText().startsWith("ravi-kumar-"));
  String secondId=second.get("id").asText();admin.call("POST","/api/admin/applications/"+secondId+"/review",Map.of("decision","rejected","reason",""),400);
  admin.call("POST","/api/admin/applications/"+secondId+"/review",Map.of("decision","rejected","reason","Contact details require correction"),200);
  assertEquals("rejected",db.queryForObject("SELECT registration_status FROM accounts WHERE email=?",String.class,"approval-rejected@example.test"));
  String rejection=db.queryForObject("SELECT body FROM email_outbox WHERE recipient=? AND subject LIKE '%registration rejected%'",String.class,"approval-rejected@example.test");assertTrue(rejection.contains("Contact details require correction"));assertFalse(rejection.contains("Temporary password:"));
  rejected.call("POST","/api/auth/login",Map.of("username",second.get("username").asText(),"password","Unknown-password-123!","role","provider"),401);
 }

 @Test void migrationQueuesUnverifiedOwnersWithoutChangingExistingActiveAccounts()throws Exception{
  String id=UUID.randomUUID().toString();accounts.create(id,"unverified-owner","unverified-owner@example.test",null,"provider","unverified-org","Unverified Owner",false);
  db.update("INSERT INTO provider_business_profiles(provider_id,status,active,document,updated_at) VALUES(?,'draft',TRUE,?,?)","unverified-org",json.writeValueAsString(Map.of("name","Unverified Owner","phone","9876543210")),System.currentTimeMillis());
  try(var connection=db.getDataSource().getConnection()){org.springframework.jdbc.datasource.init.ScriptUtils.executeSqlScript(connection,new org.springframework.core.io.ClassPathResource("db/migration/V6__provider_registration_approval.sql"));}
  assertEquals("pending",db.queryForObject("SELECT registration_status FROM accounts WHERE id=?",String.class,id));
  applications.run(new org.springframework.boot.DefaultApplicationArguments());applications.run(new org.springframework.boot.DefaultApplicationArguments());
  assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM provider_applications WHERE email=?",Integer.class,"unverified-owner@example.test"));
  assertEquals("approved",db.queryForObject("SELECT registration_status FROM accounts WHERE username='jwt-admin'",String.class));
 }
}
