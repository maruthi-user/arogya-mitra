package in.arogyamitra.pharmacy;

import static in.arogyamitra.shared.ApiInput.*;

import in.arogyamitra.shared.persistence.CatalogRepository;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PharmacyService {
    private final in.arogyamitra.reference.ReferenceCatalog reference;
    private final CatalogRepository store;

    public PharmacyService(
            CatalogRepository store, in.arogyamitra.reference.ReferenceCatalog reference) {
        this.reference = reference;
        this.store = store;
    }

    @Transactional
    public void stock(String id, String medicine, boolean available) {
        var item = store.lockEntity(id);
        if (!reference.contains("medicines", medicine) || !(item.get("stock") instanceof Map<?, ?>))
            throw invalid("Invalid pharmacy or medicine");
        var stock = new LinkedHashMap<String, Object>();
        ((Map<?, ?>) item.get("stock")).forEach((k, v) -> stock.put(k.toString(), v));
        stock.put(medicine, available);
        item.put("stock", stock);
        store.save(id, item);
    }
}
