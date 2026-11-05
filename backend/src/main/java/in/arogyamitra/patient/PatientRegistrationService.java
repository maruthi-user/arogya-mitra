package in.arogyamitra.patient;

import java.util.Map;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import in.arogyamitra.auth.AccountRepository;
import in.arogyamitra.platform.service.users.PasswordPolicy;
import static in.arogyamitra.shared.ApiInput.*;

@Service
public class PatientRegistrationService {
 private final PatientService patients; private final AccountRepository accounts;
 private final PasswordEncoder passwords;
 public PatientRegistrationService(PatientService patients,AccountRepository accounts,PasswordEncoder passwords){this.patients=patients;this.accounts=accounts;this.passwords=passwords;}
 @Transactional public Map<String,Object> register(Map<String,Object> input){
  String phone=text(input,"phone").replaceFirst("^\\+91","");
  if(!phone.matches("[6-9]\\d{9}"))throw invalid("Enter a valid 10-digit mobile number");
  String password=text(input,"password");
  if(!password.equals(input.get("confirmPassword")))throw invalid("The passwords do not match");
  PasswordPolicy.check(password);
  if(accounts.login(phone).isPresent())throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"This mobile number is already registered. Please sign in.");
  String language="te".equals(input.get("language"))?"te":"en";
  var patient=patients.create(Map.of("name",text(input,"name"),"village",text(input,"village"),"language",language));
  String patientId=(String)patient.get("id");patients.update(patientId,Map.of("phone",phone));
  // Core identity requires a unique email; this internal identifier is never
  // used for delivery or exposed as a verified patient contact address.
  accounts.create(UUID.randomUUID().toString(),phone,"patient-"+patientId+"@accounts.invalid",passwords.encode(password),"patient",patientId,text(input,"name"),true);
  return Map.of("username",phone,"name",patient.get("name"),"status","active");
 }
}
