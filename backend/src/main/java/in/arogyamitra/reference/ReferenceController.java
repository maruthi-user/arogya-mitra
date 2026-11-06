package in.arogyamitra.reference;

import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reference-data")
public class ReferenceController {
    private final ReferenceCatalog catalog;

    public ReferenceController(ReferenceCatalog catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    public Map<String, Object> all() {
        return catalog.all();
    }
}
