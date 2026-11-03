package in.arogyamitra.auth;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AccountRepository {
    private final JdbcTemplate db;private final PlatformAccountBridge bridge;
    public AccountRepository(JdbcTemplate db,PlatformAccountBridge bridge){this.db=db;this.bridge=bridge;}
    public Optional<Map<String,Object>> login(String identifier){return db.query("SELECT * FROM accounts WHERE username=? OR email=?",(r,n)->{
        Map<String,Object> row=new HashMap<>();for(String k:List.of("id","username","email","role","subject_id","display_name"))row.put(k,r.getString(k));
        row.put("must_change_password",r.getBoolean("must_change_password"));row.put("registration_status",r.getString("registration_status"));row.put("password_hash",r.getString("password_hash"));row.put("active",r.getBoolean("active")&&!r.getBoolean("suspended"));row.put("credential_version",r.getInt("credential_version"));return row;
    },identifier,identifier).stream().findFirst();}
    public void create(String id,String username,String email,String hash,String role,String subject,String name,boolean active){
        db.update("INSERT INTO accounts(id,username,email,password_hash,role,subject_id,display_name,active,created_at) VALUES(?,?,?,?,?,?,?,?,?)",id,username,email,hash,role,subject,name,active,System.currentTimeMillis());bridge.sync(id,false);
    }
    public Optional<String> credentialHash(String identifier){return db.query("SELECT password FROM APP_USERS WHERE username=? OR email=?",(r,n)->r.getString(1),identifier,identifier).stream().findFirst();}
    public boolean publicProvider(String id){return db.queryForObject("SELECT COUNT(*) FROM accounts a JOIN APP_USERS u ON u.username=a.username WHERE a.subject_id=? AND a.role='provider' AND a.active=TRUE AND a.suspended=FALSE AND a.registration_status='approved' AND a.must_change_password=FALSE AND u.status='ACTIVE' AND u.role='PROVIDER' AND NOT EXISTS (SELECT 1 FROM provider_business_profiles b WHERE b.provider_id=a.subject_id AND (b.status<>'approved' OR b.active=FALSE OR NOT EXISTS (SELECT 1 FROM care_services cs WHERE cs.provider_id=a.subject_id AND cs.approval='approved' AND cs.active=TRUE)))",Integer.class,id)>0;}
    public Optional<String> providerEmail(String id){return db.query("SELECT a.email FROM accounts a JOIN APP_USERS u ON u.username=a.username WHERE a.subject_id=? AND a.role='provider' AND a.active=TRUE AND a.suspended=FALSE AND u.status='ACTIVE' AND u.role='PROVIDER'",(r,n)->r.getString(1),id).stream().findFirst();}
}
