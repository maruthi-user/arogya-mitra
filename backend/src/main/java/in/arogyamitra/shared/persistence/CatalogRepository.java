package in.arogyamitra.shared.persistence;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.util.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.beans.factory.annotation.Value;
@Repository
public class CatalogRepository {
    private final JdbcTemplate db;
    private final ObjectMapper json;
    @Value("${app.seed-demo:false}") boolean seedDemo;
    public CatalogRepository(JdbcTemplate db, ObjectMapper json) { this.db = db; this.json = json; }
    @PostConstruct void seed() throws Exception {
        if(!seedDemo)db.update("UPDATE entities SET sample_data=TRUE WHERE id IN ('p1','p2','p3','p4','p5','s1','s2','s3')");
        if(seedDemo){
        var seed = json.readValue(new ClassPathResource("seed.json").getInputStream(), new TypeReference<Map<String,List<Map<String,Object>>>>() {});
        for (String kind : List.of("providers", "pharmacies")) {
            for (var item : seed.get(kind)) {
                if (db.queryForObject("SELECT COUNT(*) FROM entities WHERE id=?", Integer.class, item.get("id")) == 0)
                    db.update("INSERT INTO entities(id,kind,document) VALUES(?,?,?)", item.get("id"), kind, encode(item));
            }
        }
        }
        // Preserve earlier locally saved bookings when upgrading the workflow.
        for (var booking : db.query("SELECT document FROM bookings", (r,n) -> decode(r.getString(1)))) {
            if ("booked".equals(booking.get("status"))) booking.put("status", "confirmed");
            booking.putIfAbsent("patientId", "demo-patient");
            booking.putIfAbsent("history", List.of());
            db.update("UPDATE bookings SET status=?,document=? WHERE id=?",booking.get("status"),encode(booking),booking.get("id"));
        }
    }
    public Map<String,Object> decode(String text) {
        try { return json.readValue(text, new TypeReference<Map<String,Object>>() {}); }
        catch (Exception e) { throw new IllegalStateException("Invalid stored document", e); }
    }
    public String encode(Object value) {
        try { return json.writeValueAsString(value); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    public List<Map<String,Object>> entities(String kind) {
        return db.query("SELECT document FROM entities WHERE kind=? AND (sample_data=FALSE OR ?=TRUE) ORDER BY id", (r,n) -> decode(r.getString(1)), kind,seedDemo);
    }
    public Map<String,Object> lockEntity(String id) {
        var rows = db.query("SELECT document FROM entities WHERE id=? FOR UPDATE", (r,n) -> decode(r.getString(1)), id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Provider not found");
        return rows.get(0);
    }

    public Map<String,Object> get(String id, String kind) {
        var rows=db.query("SELECT document FROM entities WHERE id=? AND kind=? AND (sample_data=FALSE OR ?=TRUE)",(r,n)->decode(r.getString(1)),id,kind,seedDemo);
        if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Resource not found");
        return rows.get(0);
    }
    public void save(String id,Map<String,Object> item) {db.update("UPDATE entities SET document=? WHERE id=?",encode(item),id);}
    public void create(String id,String kind,Map<String,Object> item) {db.update("INSERT INTO entities(id,kind,document) VALUES(?,?,?)",id,kind,encode(item));}
}
