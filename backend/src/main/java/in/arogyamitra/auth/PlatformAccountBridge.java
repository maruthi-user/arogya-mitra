package in.arogyamitra.auth;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import in.arogyamitra.platform.repository.users.AppUserRepository;
import in.arogyamitra.platform.entity.users.AppUser;
import in.arogyamitra.platform.enums.UserStatus;
import in.arogyamitra.platform.service.auth.SessionService;

/** Links healthcare organisation accounts to the template's JPA identity without changing domain IDs. */
@Service
public class PlatformAccountBridge {
    private final JdbcTemplate db;private final AppUserRepository users;private final SessionService sessions;
    public PlatformAccountBridge(JdbcTemplate db,AppUserRepository users,SessionService sessions){this.db=db;this.users=users;this.sessions=sessions;}
    @Transactional public void sync(String accountId,boolean invalidate){
        var rows=db.queryForList("SELECT * FROM accounts WHERE id=?",accountId);if(rows.isEmpty())return;var a=rows.get(0);String username=(String)a.get("username");
        AppUser u=users.findByUsernameIgnoreCase(username).orElseGet(()->new AppUser(username,(String)a.get("email"),Objects.toString(a.get("password_hash"),""),((String)a.get("role")).toUpperCase(Locale.ROOT)));
        u.setEmail((String)a.get("email"));u.setRole(((String)a.get("role")).toUpperCase(Locale.ROOT));u.setPasswordHash(Objects.toString(a.get("password_hash"),""));u.setStatus(Boolean.TRUE.equals(a.get("active"))&&!Boolean.TRUE.equals(a.get("suspended"))?UserStatus.ACTIVE:UserStatus.INACTIVE);users.saveAndFlush(u);
        if(invalidate)sessions.revokeAll(u.getId(),null,SessionService.REASON_ADMIN);
    }
    @Transactional public void syncOrganisation(String provider){for(String id:db.query("SELECT id FROM accounts WHERE subject_id=?",(r,n)->r.getString(1),provider))sync(id,true);}
}
