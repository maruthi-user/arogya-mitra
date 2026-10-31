package in.arogyamitra.patient;

import jakarta.annotation.PostConstruct;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static in.arogyamitra.shared.ApiInput.*;
import org.springframework.beans.factory.annotation.Value;

@Service
public class PatientService {
    private final PatientRepository patients;
    @Value("${app.seed-demo:false}") boolean seedDemo;
    public PatientService(PatientRepository patients){this.patients=patients;}
    @PostConstruct void seed(){
        if(!seedDemo)return;
        if(patients.find("demo-patient").isEmpty())patients.create("demo-patient","Sample patient 1","rama","te");
        if(patients.find("demo-patient-2").isEmpty())patients.create("demo-patient-2","Sample patient 2","rama","te");
    }
    public List<Map<String,Object>> list(){return patients.list();}
    public Map<String,Object> get(String id){return patients.find(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Patient not found"));}
    private void validate(Map<String,Object> body){
        if(text(body,"name").length()>40 || !Set.of("rama","krishna","gopala","venkata").contains(text(body,"village"))
            || !Set.of("te","en").contains(text(body,"language")))throw invalid("Invalid patient profile");
    }
    @Transactional public Map<String,Object> create(Map<String,Object> body){
        validate(body);String id=UUID.randomUUID().toString();
        patients.create(id,text(body,"name"),text(body,"village"),text(body,"language"));return get(id);
    }
    @Transactional public Map<String,Object> update(String id,Map<String,Object> changes){
        var body=new HashMap<>(get(id));body.putAll(changes);validate(body);
        String phone=body.getOrDefault("phone","") instanceof String value?value.trim():"";
        if(!phone.isEmpty()&&!phone.matches("(?:\\+91)?[6-9]\\d{9}"))throw invalid("Enter a valid phone number");
        patients.update(id,text(body,"name"),text(body,"village"),text(body,"language"),phone);return get(id);
    }
}
