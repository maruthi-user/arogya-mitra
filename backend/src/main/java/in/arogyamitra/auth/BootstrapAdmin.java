package in.arogyamitra.auth;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import org.slf4j.*;
import java.util.*;

@Component
public class BootstrapAdmin {
    private static final Logger log=LoggerFactory.getLogger(BootstrapAdmin.class);
    private final JdbcTemplate db;private final AccountRepository accounts;private final PasswordEncoder passwords;
    @Value("${app.admin.username:}") String username;@Value("${app.admin.email:}") String email;@Value("${app.admin.password:}") String password;
    public BootstrapAdmin(JdbcTemplate db,AccountRepository accounts,PasswordEncoder passwords){this.db=db;this.accounts=accounts;this.passwords=passwords;}
    @PostConstruct void initialize(){
        if(db.queryForObject("SELECT COUNT(*) FROM accounts WHERE role='admin'",Integer.class)>0)return;
        if(username.isBlank()&&email.isBlank()&&password.isBlank()){log.warn("No administrator exists. Configure ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD once, then restart.");return;}
        if(!username.matches("[A-Za-z0-9_.-]{3,50}")||!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")||password.length()<12||password.length()>72)throw new IllegalStateException("Admin bootstrap requires a valid username/email and a 12–72 character password");
        String id=UUID.randomUUID().toString();accounts.create(id,username.toLowerCase(Locale.ROOT),email.toLowerCase(Locale.ROOT),passwords.encode(password),"admin",id,"Administrator",true);
        log.info("Initial administrator created. Remove ADMIN_PASSWORD from the runtime environment after setup.");
    }
}
