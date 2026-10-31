package in.arogyamitra.booking;

import in.arogyamitra.shared.persistence.CatalogRepository;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Persistence only. The service owns transactions and provider-before-booking lock ordering. */
@Repository
public class BookingRepository {
    private final JdbcTemplate db;
    private final CatalogRepository documents;
    public BookingRepository(JdbcTemplate db,CatalogRepository documents){this.db=db;this.documents=documents;}
    public boolean slotReserved(String provider,String date,String time,long now){
        return db.queryForObject("SELECT COUNT(*) FROM bookings WHERE pid=? AND booking_date=? AND booking_time=? AND (status='confirmed' OR (status='pending' AND expires_at>?))",Integer.class,provider,date,time,now)>0;
    }
    public void insert(Map<String,Object> booking){
        db.update("INSERT INTO bookings(id,pid,booking_date,booking_time,status,document,expires_at) VALUES(?,?,?,?,?,?,?)",booking.get("id"),booking.get("pid"),booking.get("date"),booking.get("time"),booking.get("status"),documents.encode(booking),booking.get("expiresAt"));
    }
    public Optional<String> providerId(String id){return db.query("SELECT pid FROM bookings WHERE id=?",(r,n)->r.getString(1),id).stream().findFirst();}
    public Optional<Map<String,Object>> lock(String id){return db.query("SELECT document FROM bookings WHERE id=? FOR UPDATE",(r,n)->documents.decode(r.getString(1)),id).stream().findFirst();}
    public void update(Map<String,Object> booking){db.update("UPDATE bookings SET status=?,document=? WHERE id=?",booking.get("status"),documents.encode(booking),booking.get("id"));}
    public List<Map<String,Object>> expired(long now){return db.query("SELECT document FROM bookings WHERE status='pending' AND expires_at<=?",(r,n)->documents.decode(r.getString(1)),now);}
    public void expireIfPending(Map<String,Object> booking,long now){db.update("UPDATE bookings SET status='expired',document=? WHERE id=? AND status='pending' AND expires_at<=?",documents.encode(booking),booking.get("id"),now);}
    public List<Map<String,Object>> list(){return db.query("SELECT document FROM bookings ORDER BY booking_date,booking_time,id",(r,n)->documents.decode(r.getString(1)));}
}
