package in.arogyamitra.provider;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import in.arogyamitra.shared.persistence.CatalogRepository;
import static in.arogyamitra.shared.ApiInput.*;
@Service
public class ProviderService {
    private final CatalogRepository store;
    public ProviderService(CatalogRepository store){this.store=store;}
    public List<Map<String,Object>> list(String village,String type,Boolean open){return store.entities("providers").stream()
        .filter(p->village==null||village.equals(p.get("village")))
        .filter(p->type==null||type.equals(p.get("type")))
        .filter(p->open==null||open.equals(p.get("open"))).toList();}
    public Map<String,Object> get(String id){return store.get(id,"providers");}
    @Transactional public Map<String,Object> create(Map<String,Object> input) {
        String name=text(input,"name"),type=text(input,"type"),village=text(input,"village"),phone=text(input,"phone");
        if(name.length()>80 || !Set.of("mbbs","rmp","ayush").contains(type)
            || !Set.of("rama","krishna","gopala","venkata").contains(village) || !phone.matches("\\d{10}")) throw invalid("Invalid provider details");
        var profile=new HashMap<>(input);profile.putIfAbsent("fee",0);profile.putIfAbsent("services","");
        validateProfile(profile);
        String id="p-"+UUID.randomUUID();
        var item=new LinkedHashMap<String,Object>();
        item.put("id",id);item.put("name",name);item.put("type",type);item.put("village",village);item.put("phone",phone);
        item.put("open",input.containsKey("open")?bool(input,"open"):false);
        item.put("slots",new TreeSet<>((List<String>)profile.get("slots")));item.put("fee",((Number)profile.get("fee")).intValue());item.put("services",profile.get("services"));
        item.put("verificationStatus","unverified");store.create(id,"providers",item);return item;
    }
    private void validateProfile(Map<String,Object> input) {
        if (!(input.get("slots") instanceof List<?> slots) || slots.isEmpty() || slots.size()>24
            || slots.stream().anyMatch(t -> !(t instanceof String time) || !time.matches("([01]\\d|2[0-3]):[0-5]\\d"))
            || !(input.get("fee") instanceof Number fee) || fee.doubleValue()!=fee.intValue() || fee.intValue()<0 || fee.intValue()>100000
            || !(input.get("services") instanceof String services) || services.length()>200) throw invalid("Invalid provider profile");
    }
    @Transactional public void profile(String id, Map<String,Object> input) {
        var item=store.lockEntity(id);
        if (!(item.get("slots") instanceof List<?>)) throw invalid("Provider required");
        validateProfile(input);
        item.put("slots",new TreeSet<>((List<String>)input.get("slots"))); item.put("fee",((Number)input.get("fee")).intValue()); item.put("services",input.get("services")); store.save(id,item);
    }
    @Transactional public void schedule(String id,Map<String,Object> input) {
        var item=store.lockEntity(id);
        var profile=new HashMap<String,Object>();profile.put("slots",input.get("slots"));
        profile.put("fee",item.getOrDefault("fee",0));profile.put("services",item.getOrDefault("services",""));profile(id,profile);
    }
    @Transactional public void open(String id, boolean open) {
        var item = store.lockEntity(id); item.put("open",open); store.save(id,item);
    }
}
