package in.arogyamitra.auth;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import in.arogyamitra.security.AccessService;
import in.arogyamitra.platform.service.users.PasswordPolicy;
import static in.arogyamitra.shared.ApiInput.*;

@Service
public class InitialPasswordService {
 private final JdbcTemplate db;private final AccessService access;private final PasswordEncoder passwords;private final PlatformAccountBridge bridge;
 public InitialPasswordService(JdbcTemplate db,AccessService access,PasswordEncoder passwords,PlatformAccountBridge bridge){this.db=db;this.access=access;this.passwords=passwords;this.bridge=bridge;}
 @Transactional public void change(String current,String replacement){
  var u=access.require("provider");
  var rows=db.queryForList("SELECT must_change_password FROM accounts WHERE id=? AND active=TRUE AND suspended=FALSE AND registration_status='approved' FOR UPDATE",u.accountId());
  if(rows.isEmpty()||!Boolean.TRUE.equals(rows.get(0).get("must_change_password")))throw invalid("No initial password change is pending");
  String hash=db.queryForObject("SELECT password FROM APP_USERS WHERE username=(SELECT username FROM accounts WHERE id=?)",String.class,u.accountId());
  if(current==null||current.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72||!passwords.matches(current,hash))throw invalid("The temporary password is incorrect");
  try{PasswordPolicy.check(replacement);}catch(in.arogyamitra.platform.exception.BadRequestException e){throw invalid(e.getMessage());}
  if(passwords.matches(replacement,hash))throw invalid("Choose a different password from your temporary password");
  db.update("UPDATE accounts SET password_hash=?,must_change_password=FALSE,credential_version=credential_version+1 WHERE id=?",passwords.encode(replacement),u.accountId());
  bridge.sync(u.accountId(),true);
  db.update("INSERT INTO audit_events(id,actor_id,action,resource_id,detail,created_at) VALUES(?,?,?,?,?,?)",UUID.randomUUID().toString(),u.accountId(),"account.initial_password_changed",u.subjectId(),"",System.currentTimeMillis());
 }
}
