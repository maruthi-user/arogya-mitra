package in.arogyamitra.auth;

import jakarta.servlet.http.*;
import java.util.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import in.arogyamitra.security.*;
import in.arogyamitra.patient.PatientService;
import in.arogyamitra.registration.ProviderApplicationService;
import static in.arogyamitra.shared.ApiInput.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AccountRepository accounts;private final PasswordEncoder passwords;private final SecurityContextRepository contexts;private final CsrfTokenRepository csrf;
    private final AccessService access;private final PatientService patients;private final ProviderApplicationService applications;private final ActivationService activation;private final RequestThrottle throttle;
    private String dummyHash;
    public AuthController(AccountRepository accounts,PasswordEncoder passwords,SecurityContextRepository contexts,CsrfTokenRepository csrf,AccessService access,PatientService patients,ProviderApplicationService applications,ActivationService activation,RequestThrottle throttle){this.accounts=accounts;this.passwords=passwords;this.contexts=contexts;this.csrf=csrf;this.access=access;this.patients=patients;this.applications=applications;this.activation=activation;this.throttle=throttle;this.dummyHash=passwords.encode(UUID.randomUUID().toString());}
    @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token){return Map.of("token",token.getToken(),"headerName",token.getHeaderName());}
    @GetMapping("/session") public Map<String,Object> session(){var user=access.optional();if(user==null)return Map.of("role","anonymous");return Map.of("role",user.role(),"subjectId",user.subjectId(),"name",user.displayName(),"profile",user.role().equals("patient")?patients.get(user.subjectId()):Map.of());}
    private void establish(Identity identity,HttpServletRequest request,HttpServletResponse response){
        request.getSession();request.changeSessionId();
        var auth=UsernamePasswordAuthenticationToken.authenticated(identity,null,List.of(new SimpleGrantedAuthority("ROLE_"+identity.role().toUpperCase(Locale.ROOT))));
        var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(auth);SecurityContextHolder.setContext(context);contexts.saveContext(context,request,response);
        new CsrfAuthenticationStrategy(csrf).onAuthentication(auth,request,response);
    }
    @PostMapping("/guest") public Map<String,Object> guest(@RequestBody(required=false) Map<String,Object> body,HttpServletRequest request,HttpServletResponse response){
        var previous=access.optional();if(previous!=null&&previous.role().equals("patient"))return session();
        throttle.check("guest:"+request.getRemoteAddr(),40);
        String language=body!=null&&"en".equals(body.get("language"))?"en":"te";
        var profile=patients.create(Map.of("name","Guest","village","rama","language",language));
        establish(new Identity("","patient",(String)profile.get("id"),"Guest"),request,response);return session();
    }
    @PostMapping("/login") public Map<String,Object> login(@RequestBody Map<String,Object> body,HttpServletRequest request,HttpServletResponse response){
        String identifier=text(body,"username").toLowerCase(Locale.ROOT),role=text(body,"role");
        if(!(body.get("password") instanceof String password)||password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw invalid("Invalid password");
        throttle.check("login:"+request.getRemoteAddr(),20);
        var row=accounts.login(identifier);
        String candidate=row.isPresent()&&row.get().get("password_hash") instanceof String hash?hash:dummyHash;
        boolean matches=passwords.matches(password,candidate);
        if(row.isEmpty()||!role.equals(row.get().get("role"))||!Boolean.TRUE.equals(row.get().get("active"))||!matches)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Unable to sign in. Check your credentials and account activation.");
        var a=row.get();establish(new Identity((String)a.get("id"),role,(String)a.get("subject_id"),(String)a.get("display_name"),((Number)a.get("credential_version")).intValue()),request,response);return session();
    }
    @PostMapping("/logout") public Map<String,Boolean> logout(HttpServletRequest request,HttpServletResponse response){var session=request.getSession(false);if(session!=null)session.invalidate();SecurityContextHolder.clearContext();return Map.of("ok",true);}
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED) public Map<String,Object> register(@RequestBody Map<String,Object> body,HttpServletRequest request){throttle.check("register:"+request.getRemoteAddr(),10);return applications.submit(body);}
    @PostMapping("/activate") public Map<String,String> activate(@RequestBody Map<String,Object> body,HttpServletRequest request){throttle.check("activate:"+request.getRemoteAddr(),20);if(!(body.get("password") instanceof String password))throw invalid("Password required");activation.activate(text(body,"token"),password);return Map.of("message","Password saved. You can now sign in.");}
    @PostMapping("/request-setup") public Map<String,String> requestSetup(@RequestBody Map<String,Object> body,HttpServletRequest request){throttle.check("setup:"+request.getRemoteAddr(),5);activation.request(text(body,"email"));return Map.of("message","If an approved account exists, a password link will be emailed.");}
}
