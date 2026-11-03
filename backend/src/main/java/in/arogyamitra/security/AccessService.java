package in.arogyamitra.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@Service
public class AccessService {
    private final org.springframework.jdbc.core.JdbcTemplate db;
    public AccessService(org.springframework.jdbc.core.JdbcTemplate db){this.db=db;}
    public Identity optional(){
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth!=null&&auth.getPrincipal() instanceof Identity identity)return identity;
        if(auth!=null&&auth.getPrincipal() instanceof in.arogyamitra.platform.security.CurrentUser user){return db.query("SELECT id,role,subject_id,display_name,credential_version FROM accounts WHERE username=? AND role=? AND active=TRUE AND suspended=FALSE",(r,n)->new Identity(r.getString(1),r.getString(2),r.getString(3),r.getString(4),r.getInt(5)),user.getDisplayName(),user.getRole().toLowerCase(java.util.Locale.ROOT)).stream().findFirst().orElse(null);}return null;
    }
    public Identity current(){var identity=optional();if(identity==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Please sign in or continue as a patient");return identity;}
    public Identity require(String role){var identity=current();if(!role.equals(identity.role()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This action is not permitted for your role");return identity;}
    public void patient(String id){var user=current();if(!user.role().equals("admin")&&!(user.role().equals("patient")&&user.subjectId().equals(id)))throw forbidden();}
    public void provider(String id){var user=current();if(!user.role().equals("admin")&&!(user.role().equals("provider")&&user.subjectId().equals(id)))throw forbidden();}
    public Map<String,Object> actor(){var user=current();return Map.of("role",user.role(),"id",user.subjectId());}
    public ResponseStatusException forbidden(){return new ResponseStatusException(HttpStatus.FORBIDDEN,"You cannot access this record");}
}
