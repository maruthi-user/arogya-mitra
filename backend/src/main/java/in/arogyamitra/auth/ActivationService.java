package in.arogyamitra.auth;

import java.security.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import in.arogyamitra.notification.NotificationService;
import static in.arogyamitra.shared.ApiInput.*;

@Service
public class ActivationService {
    private final JdbcTemplate db;private final NotificationService notifications;private final PasswordEncoder passwords;
    private final SecureRandom random=new SecureRandom();
    @Value("${app.frontend-url:http://localhost:3000}") String frontend;
    public ActivationService(JdbcTemplate db,NotificationService notifications,PasswordEncoder passwords){this.db=db;this.notifications=notifications;this.passwords=passwords;}
    private String hash(String token){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
    public void issue(String accountId,String email,String instructions){
        db.update("UPDATE activation_tokens SET used=TRUE WHERE account_id=?",accountId);
        byte[] bytes=new byte[32];random.nextBytes(bytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        db.update("INSERT INTO activation_tokens(token_hash,account_id,expires_at,used) VALUES(?,?,?,FALSE)",hash(token),accountId,System.currentTimeMillis()+86400000);
        notifications.queue(email,"Arogya Mitra — account access",instructions+"\n\nSet your password (valid for 24 hours, one use):\n"+frontend+"/#activate="+token+"\n\nLogin: "+frontend+"/#provider-login\nIf you did not request this, ignore this email.");
    }
    @Transactional public void request(String email){
        var accounts=db.queryForList("SELECT id,email FROM accounts WHERE email=? AND role='provider'",email.toLowerCase(Locale.ROOT));
        if(!accounts.isEmpty())issue((String)accounts.get(0).get("id"),(String)accounts.get(0).get("email"),"Use this link to set or reset your provider password.");
    }
    @Transactional public void activate(String token,String password){
        if(password.length()<12||password.getBytes(StandardCharsets.UTF_8).length>72)throw invalid("Use at least 12 characters and at most 72 UTF-8 bytes");
        if(token.length()>200)throw invalid("Invalid activation link");
        var rows=db.queryForList("SELECT account_id,expires_at,used FROM activation_tokens WHERE token_hash=? FOR UPDATE",hash(token));
        if(rows.isEmpty()||Boolean.TRUE.equals(rows.get(0).get("used"))||((Number)rows.get(0).get("expires_at")).longValue()<=System.currentTimeMillis())throw invalid("This link is invalid or expired. Request a new password link.");
        String account=(String)rows.get(0).get("account_id");
        db.update("UPDATE accounts SET password_hash=?,active=TRUE,credential_version=credential_version+1 WHERE id=?",passwords.encode(password),account);
        db.update("UPDATE activation_tokens SET used=TRUE WHERE account_id=?",account);
    }
}
