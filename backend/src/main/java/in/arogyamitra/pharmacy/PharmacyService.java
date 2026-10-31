package in.arogyamitra.pharmacy;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import in.arogyamitra.shared.persistence.CatalogRepository;
import static in.arogyamitra.shared.ApiInput.*;
@Service
public class PharmacyService {
    private final CatalogRepository store;
    private static final Set<String> MEDICINES=Set.of("para","ors","cetirizine","antacid","cough","iron","amox");
    public PharmacyService(CatalogRepository store){this.store=store;}
    @Transactional public void stock(String id, String medicine, boolean available) {
        var item = store.lockEntity(id);
        if (!MEDICINES.contains(medicine) || !(item.get("stock") instanceof Map<?,?>)) throw invalid("Invalid pharmacy or medicine");
        var stock = new LinkedHashMap<String,Object>();
        ((Map<?,?>)item.get("stock")).forEach((k,v) -> stock.put(k.toString(),v));
        stock.put(medicine,available); item.put("stock",stock); store.save(id,item);
    }
}
