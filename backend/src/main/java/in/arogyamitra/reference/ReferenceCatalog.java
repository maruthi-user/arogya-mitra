package in.arogyamitra.reference;

import java.util.*;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.core.io.ClassPathResource;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import in.arogyamitra.shared.persistence.CatalogRepository;

/** Persistent editable taxonomy; initial values are inserted only when absent. */
@Service
public class ReferenceCatalog {
    private final JdbcTemplate db;private final CatalogRepository store;private final ObjectMapper json;
    public ReferenceCatalog(JdbcTemplate db,CatalogRepository store,ObjectMapper json){this.db=db;this.store=store;this.json=json;}
    @PostConstruct void initialize()throws Exception{
        try(var input=new ClassPathResource("reference-catalog.json").getInputStream()){
            Map<String,List<Object>> initial=json.readValue(input,new TypeReference<>(){});
            for(var category:initial.entrySet()){
                int order=0;
                for(Object item:category.getValue()){
                    String id=item instanceof Map<?,?> m?m.get("id").toString():item.toString();
                    if(db.queryForObject("SELECT COUNT(*) FROM reference_catalog WHERE category=? AND ref_id=?",Integer.class,category.getKey(),id)==0)
                        db.update("INSERT INTO reference_catalog(category,ref_id,document,display_order,active) VALUES(?,?,?,?,TRUE)",category.getKey(),id,store.encode(item),order);
                    order++;
                }
            }
        }
    }
    public List<Map<String,Object>> items(String category){return db.query("SELECT document FROM reference_catalog WHERE category=? AND active=TRUE ORDER BY display_order,ref_id",(r,n)->store.decode(r.getString(1)),category);}
    public boolean contains(String category,String id){return db.queryForObject("SELECT COUNT(*) FROM reference_catalog WHERE category=? AND ref_id=? AND active=TRUE",Integer.class,category,id)>0;}
    public Set<String> ids(String category){return new LinkedHashSet<>(db.query("SELECT ref_id FROM reference_catalog WHERE category=? AND active=TRUE ORDER BY display_order,ref_id",(r,n)->r.getString(1),category));}
    public boolean permits(String business,String service){return items("businessTypes").stream().anyMatch(b->business.equals(b.get("id"))&&b.get("services") instanceof List<?> services&&services.contains(service))&&contains("serviceKinds",service);}
    public Map<String,Object> all(){
        Map<String,Object> result=new LinkedHashMap<>();
        for(String category:List.of("villages","medicines","symptoms","redFlags","serviceKinds","businessTypes"))result.put(category,items(category));
        result.put("emergencyKeywords",db.query("SELECT ref_id FROM reference_catalog WHERE category='emergencyKeywords' AND active=TRUE ORDER BY display_order,ref_id",(r,n)->r.getString(1)));
        return result;
    }
}
