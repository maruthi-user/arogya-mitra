package in.arogyamitra.compatibility;

import static in.arogyamitra.shared.ApiInput.*;

import in.arogyamitra.auth.AccountRepository;
import in.arogyamitra.booking.BookingService;
import in.arogyamitra.provider.ProviderService;
import in.arogyamitra.security.AccessService;
import in.arogyamitra.shared.persistence.CatalogRepository;
import java.util.*;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

/** Existing frontend aggregate and pharmacy routes. Domain APIs have their own controllers. */
@RestController
@RequestMapping("/api")
public class ApiController {
    private final ClinicService service;
    private final AccessService access;
    private final AccountRepository accounts;
    private final ProviderService providers;
    private final BookingService bookings;
    private final CatalogRepository store;

    public ApiController(
            ClinicService service,
            AccessService access,
            AccountRepository accounts,
            ProviderService providers,
            BookingService bookings,
            CatalogRepository store) {
        this.service = service;
        this.access = access;
        this.accounts = accounts;
        this.providers = providers;
        this.bookings = bookings;
        this.store = store;
    }

    @GetMapping("/state")
    public Map<String, Object> state() {
        var u = access.optional();
        var visible =
                providers.list(null, null, null).stream()
                        .filter(
                                p ->
                                        (accounts.publicProvider((String) p.get("id"))
                                                        && Set.of("mbbs", "rmp", "ayush")
                                                                .contains(p.get("type")))
                                                || (u != null
                                                        && (u.role().equals("admin")
                                                                || u.subjectId()
                                                                        .equals(p.get("id")))))
                        .toList();
        return Map.of(
                "providers",
                visible,
                "pharmacies",
                store.entities("pharmacies"),
                "bookings",
                u == null || !Set.of("patient", "provider", "admin").contains(u.role())
                        ? List.of()
                        : bookings.list(
                                u.role().equals("patient") ? u.subjectId() : null,
                                u.role().equals("provider") ? u.subjectId() : null,
                                null));
    }

    @PatchMapping("/entities/{id}/open")
    public Map<String, Boolean> open(
            @PathVariable String id, @RequestBody Map<String, Object> body) {
        access.provider(id);
        service.open(id, bool(body, "open"));
        return Map.of("ok", true);
    }

    @PatchMapping("/pharmacies/{id}/stock")
    public Map<String, Boolean> stock(
            @PathVariable String id, @RequestBody Map<String, Object> body) {
        access.require("admin");
        service.stock(id, text(body, "medicine"), bool(body, "available"));
        return Map.of("ok", true);
    }
}
