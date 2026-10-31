package in.arogyamitra.auth;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AccountRepository {
    private final JdbcTemplate db;
    public AccountRepository(JdbcTemplate db){this.db=db;}
    public Optional<Map<String,Object>> login(String identifier){return db.query("SELECT * FROM accounts WHERE username=? OR email=?",(r,n)->{
        Map<String,Object> row=new HashMap<>();for(String k:List.of("id","username","email","role","subject_id","display_name"))row.put(k,r.getString(k));
        row.put("password_hash",r.getString("password_hash"));row.put("active",r.getBoolean("active"));row.put("credential_version",r.getInt("credential_version"));return row;
    },identifier,identifier).stream().findFirst();}
    public void create(String id,String username,String email,String hash,String role,String subject,String name,boolean active){
        db.update("INSERT INTO accounts(id,username,email,password_hash,role,subject_id,display_name,active,created_at) VALUES(?,?,?,?,?,?,?,?,?)",id,username,email,hash,role,subject,name,active,System.currentTimeMillis());
    }
    public boolean publicProvider(String id){return db.queryForObject("SELECT COUNT(*) FROM accounts WHERE subject_id=? AND role='provider' AND active=TRUE",Integer.class,id)>0;}
    public Optional<String> providerEmail(String id){return db.query("SELECT email FROM accounts WHERE subject_id=? AND role='provider' AND active=TRUE",(r,n)->r.getString(1),id).stream().findFirst();}
}
