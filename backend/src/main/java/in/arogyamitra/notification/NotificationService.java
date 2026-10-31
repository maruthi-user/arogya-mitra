package in.arogyamitra.notification;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationService {
    private final JdbcTemplate db;private final JavaMailSender mail;
    @Value("${app.mail.from:no-reply@arogyamitra.local}") String sender;
    public NotificationService(JdbcTemplate db,JavaMailSender mail){this.db=db;this.mail=mail;}
    public void queue(String recipient,String subject,String body){
        long now=System.currentTimeMillis();db.update("INSERT INTO email_outbox(id,recipient,subject,body,status,attempts,next_attempt,updated_at) VALUES(?,?,?,?,'pending',0,?,?)",UUID.randomUUID().toString(),recipient,subject,body,now,now);
    }
    public List<Map<String,Object>> list(){return db.query("SELECT id,recipient,subject,status,attempts,updated_at FROM email_outbox ORDER BY updated_at DESC LIMIT 200",(r,n)->Map.of("id",r.getString(1),"recipient",r.getString(2),"subject",r.getString(3),"status",r.getString(4),"attempts",r.getInt(5),"updatedAt",r.getLong(6)));}
    public void retry(String id){
        if(db.update("UPDATE email_outbox SET status='pending',attempts=0,next_attempt=?,updated_at=? WHERE id=? AND status='failed'",System.currentTimeMillis(),System.currentTimeMillis(),id)!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"Only a failed notification can be retried");
    }
    /** Atomic claims support multiple workers. Delivery is at-least-once, with a five-minute crash lease. */
    public synchronized void deliver(){
        long now=System.currentTimeMillis();
        db.update("UPDATE email_outbox SET status='failed',next_attempt=? WHERE status='processing' AND updated_at<?",now,now-300000);
        var rows=db.queryForList("SELECT id,recipient,subject,body,attempts FROM email_outbox WHERE status IN ('pending','failed') AND attempts<6 AND next_attempt<=? ORDER BY next_attempt LIMIT 10",now);
        for(var row:rows){
            String id=(String)row.get("ID");if(id==null)id=(String)row.get("id");
            // Jdbc column maps are case insensitive across H2 and PostgreSQL.
            if(db.update("UPDATE email_outbox SET status='processing',updated_at=? WHERE id=? AND status IN ('pending','failed')",now,id)!=1)continue;
            int attempt=((Number)row.get("attempts")).intValue()+1;
            try{
                var message=new SimpleMailMessage();message.setFrom(sender);message.setTo((String)row.get("recipient"));message.setSubject((String)row.get("subject"));message.setText((String)row.get("body"));mail.send(message);
                db.update("UPDATE email_outbox SET status='sent',body='',attempts=?,updated_at=? WHERE id=?",attempt,System.currentTimeMillis(),id);
            }catch(Exception failure){
                db.update("UPDATE email_outbox SET status='failed',attempts=?,next_attempt=?,updated_at=? WHERE id=?",attempt,now+Math.min(3600000,30000L*(1L<<attempt)),System.currentTimeMillis(),id);
            }
        }
    }
}
