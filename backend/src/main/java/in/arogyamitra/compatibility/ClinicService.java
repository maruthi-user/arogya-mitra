package in.arogyamitra.compatibility;

import in.arogyamitra.pharmacy.PharmacyService;
import in.arogyamitra.provider.ProviderService;
import org.springframework.stereotype.Service;

/** Compatibility facade for the existing frontend; business logic lives in domain services. */
@Service
public class ClinicService {
    private final ProviderService providers;
    private final PharmacyService pharmacies;

    public ClinicService(ProviderService providers, PharmacyService pharmacies) {
        this.providers = providers;
        this.pharmacies = pharmacies;
    }

    public void open(String id, boolean value) {
        providers.open(id, value);
    }

    public void stock(String id, String medicine, boolean available) {
        pharmacies.stock(id, medicine, available);
    }
}
