package in.arogyamitra.compatibility;
import java.util.*;
import in.arogyamitra.pharmacy.PharmacyService;
import org.springframework.stereotype.Service;
import in.arogyamitra.booking.BookingService;
import in.arogyamitra.provider.ProviderService;
import in.arogyamitra.shared.persistence.CatalogRepository;
/** Compatibility facade for the existing frontend; business logic lives in domain services. */
@Service
public class ClinicService {
    private final BookingService bookings;
    private final ProviderService providers;
    private final CatalogRepository store;
    private final PharmacyService pharmacies;
    public ClinicService(BookingService bookings,ProviderService providers,CatalogRepository store,PharmacyService pharmacies){this.pharmacies=pharmacies;this.bookings=bookings;this.providers=providers;this.store=store;}
    public Map<String,Object> state(){return Map.of("providers",providers.list(null,null,null),"pharmacies",store.entities("pharmacies"),"bookings",bookings.list(null,null,null));}
    public Map<String,Object> book(Map<String,Object> input){return bookings.book(input);}
    public void status(String id,String status,Map<String,Object> actor){bookings.status(id,status,actor);}
    public void profile(String id,Map<String,Object> input){providers.profile(id,input);}
    public void open(String id,boolean value){providers.open(id,value);}
    public void stock(String id,String medicine,boolean available){pharmacies.stock(id,medicine,available);}
}
