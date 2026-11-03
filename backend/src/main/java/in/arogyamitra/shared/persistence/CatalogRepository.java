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
@org.springframework.transaction.annotation.Transactional
public class CatalogRepository {
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager em;
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
        return em.createQuery("select c from CatalogRecord c where c.kind=:kind and (c.sampleData=false or :demo=true) order by c.id",in.arogyamitra.shared.entity.CatalogRecord.class).setParameter("kind",kind).setParameter("demo",seedDemo).getResultList().stream().map(c->decode(c.document)).toList();
    }
    public Map<String,Object> lockEntity(String id) {
        var record=em.find(in.arogyamitra.shared.entity.CatalogRecord.class,id,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if(record==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Provider not found");em.refresh(record,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);return decode(record.document);
    }
    public Map<String,Object> get(String id,String kind){
        var record=em.find(in.arogyamitra.shared.entity.CatalogRecord.class,id);if(record==null||!kind.equals(record.kind)||(record.sampleData&&!seedDemo))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Resource not found");return decode(record.document);
    }
    public void save(String id,Map<String,Object> item){var record=em.find(in.arogyamitra.shared.entity.CatalogRecord.class,id);record.document=encode(item);em.flush();}
    public void create(String id,String kind,Map<String,Object> item){var record=new in.arogyamitra.shared.entity.CatalogRecord();record.id=id;record.kind=kind;record.document=encode(item);em.persist(record);em.flush();}
}
