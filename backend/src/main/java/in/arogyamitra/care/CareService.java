package in.arogyamitra.care;

import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import in.arogyamitra.security.*;
import in.arogyamitra.auth.*;
import in.arogyamitra.patient.PatientService;
import in.arogyamitra.notification.NotificationService;
import in.arogyamitra.shared.persistence.CatalogRepository;
import static in.arogyamitra.shared.ApiInput.*;

@Service
public class CareService {
    private final in.arogyamitra.reference.ReferenceCatalog reference;
    private final in.arogyamitra.auth.PlatformAccountBridge bridge;private final JdbcTemplate db;private final CatalogRepository store;private final AccessService access;
    private final AccountRepository accounts;private final PatientService patients;private final NotificationService notifications;private final ActivationService activation;
    public CareService(JdbcTemplate db,CatalogRepository store,AccessService access,AccountRepository accounts,PatientService patients,NotificationService notifications,ActivationService activation,in.arogyamitra.reference.ReferenceCatalog reference,in.arogyamitra.auth.PlatformAccountBridge bridge){this.bridge=bridge;this.reference=reference;this.db=db;this.store=store;this.access=access;this.accounts=accounts;this.patients=patients;this.notifications=notifications;this.activation=activation;}
    private ResponseStatusException conflict(String m){return new ResponseStatusException(HttpStatus.CONFLICT,m);}
    private Map<String,Object> service(String id){return db.query("SELECT document FROM care_services WHERE id=?",(r,n)->store.decode(r.getString(1)),id).stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Service not found"));}
    private String string(Map<String,Object> body,String key,int max,boolean required){Object v=body.get(key);if(!(v instanceof String s)||s.length()>max||(required&&s.isBlank()))throw invalid("Invalid "+key);return s.trim();}
    private int number(Map<String,Object> body,String key,int min,int max){if(!(body.get(key) instanceof Number n)||!Double.isFinite(n.doubleValue())||n.doubleValue()!=n.intValue()||n.intValue()<min||n.intValue()>max)throw invalid("Invalid "+key);return n.intValue();}
    private boolean visible(Map<String,Object> s){String assigned=(String)s.getOrDefault("practitionerId","");return (assigned.isEmpty()||db.queryForObject("SELECT COUNT(*) FROM accounts WHERE id=? AND subject_id=? AND active=TRUE AND suspended=FALSE AND role='provider'",Integer.class,assigned,s.get("providerId"))>0)&&"approved".equals(s.get("approval"))&&Boolean.TRUE.equals(s.get("active"))&&accounts.publicProvider((String)s.get("providerId"));}
    public List<Map<String,Object>> catalog(String village,String kind,String query,boolean managed){
        Identity u=access.optional();if(managed){u=access.current();if(!Set.of("admin","provider").contains(u.role()))throw access.forbidden();}final Identity actor=u;
        return db.query("SELECT document FROM care_services ORDER BY id",(r,n)->store.decode(r.getString(1))).stream()
            .filter(s->managed?(actor.role().equals("admin")||actor.subjectId().equals(s.get("providerId"))):visible(s))
            .filter(s->village==null||((List<?>)s.get("coverage")).contains(village)).filter(s->kind==null||kind.equals(s.get("kind")))
            .filter(s->query==null||(s.get("title")+" "+s.get("titleTe")+" "+s.get("organization")+" "+s.get("description")).toLowerCase(Locale.ROOT).contains(query.toLowerCase(Locale.ROOT))).toList();
    }
    @Transactional public Map<String,Object> save(String id,Map<String,Object> input){
        var u=access.current();if(!Set.of("provider","admin").contains(u.role()))throw access.forbidden();
        String provider=id==null?(u.role().equals("provider")?u.subjectId():text(input,"providerId")):(String)service(id).get("providerId");access.provider(provider);
        var org=store.lockEntity(provider);
        if(db.queryForObject("SELECT COUNT(*) FROM accounts WHERE subject_id=? AND active=TRUE AND suspended=FALSE",Integer.class,provider)==0)throw conflict("Account must be verified and active");
        boolean draft=Boolean.TRUE.equals(input.get("draft"));
        input=new LinkedHashMap<>(input);
        if(draft){input.putIfAbsent("titleTe",input.getOrDefault("title",""));input.putIfAbsent("description","");input.putIfAbsent("capacity",1);input.putIfAbsent("resource","main");input.putIfAbsent("coverage",List.of());input.putIfAbsent("slots",List.of());input.putIfAbsent("active",true);input.putIfAbsent("available",true);}
        String business=(String)org.getOrDefault("businessType","practitioner"),kind=text(input,"kind");
        if(!reference.permits(business,kind))throw invalid("This service is not available for your business type");
        if(!(input.get("titleTe") instanceof String te)||te.isBlank())input.put("titleTe",input.get("title"));
        String title=string(input,"title",100,true),titleTe=string(input,"titleTe",100,!draft),description=string(input,"description",500,!draft&&input.containsKey("practitionerId"));
        boolean feeOnRequest=input.get("fee")==null;int fee=feeOnRequest?0:number(input,"fee",0,100000),capacity=number(input,"capacity",1,20);int duration=input.containsKey("durationMinutes")?number(input,"durationMinutes",15,480):30;
        Map<String,Object> timeWindow=null;
        if(input.get("timeWindow")!=null){
            if(!(input.get("timeWindow") instanceof Map<?,?> window))throw invalid("Invalid time window");
            Object startValue=window.get("start"),endValue=window.get("end");
            if(!(startValue instanceof String start)||!(endValue instanceof String end)||start.length()>5||end.length()>5)throw invalid("Invalid time window");
            timeWindow=Map.of("start",start,"end",end);
            List<String> generated=new ArrayList<>();
            if(!start.isEmpty()||!end.isEmpty()||!draft){
                if(!start.matches("([01]\\d|2[0-3]):[0-5]\\d")||!end.matches("([01]\\d|2[0-3]):[0-5]\\d"))throw invalid("Choose valid start and end times");
                int first=LocalTime.parse(start).toSecondOfDay()/60,last=LocalTime.parse(end).toSecondOfDay()/60;
                if(first>=last||first+duration>last)throw invalid("Time window must fit at least one full service duration");
                for(int minute=first;minute+duration<=last;minute+=duration)generated.add(String.format(Locale.ROOT,"%02d:%02d",minute/60,minute%60));
            }
            input.put("slots",generated);
        }
        if(!(input.get("coverage") instanceof List<?> coverage)||(!draft&&coverage.isEmpty())||coverage.size()>5||!reference.ids("villages").containsAll(coverage))throw invalid("Select valid coverage locations");
        if(!(input.get("slots") instanceof List<?> slots)||(!draft&&slots.isEmpty())||slots.size()>48||new HashSet<>(slots).size()!=slots.size()||slots.stream().anyMatch(t->!(t instanceof String v)||!v.matches("([01]\\d|2[0-3]):[0-5]\\d")))throw invalid("Enter unique HH:mm slots (maximum 48)");
        if(slots.stream().anyMatch(t->LocalTime.parse(t.toString()).toSecondOfDay()/60+duration>1440))throw invalid("Slots must finish before midnight");
        String practitionerId=input.containsKey("practitionerId")?string(input,"practitionerId",80,false):"",practitionerName="";
        if(!practitionerId.isEmpty()){
            var assigned=db.query("SELECT display_name FROM accounts WHERE id=? AND subject_id=? AND role='provider' AND active=TRUE AND suspended=FALSE",(r,n)->r.getString(1),practitionerId,provider);
            if(assigned.isEmpty())throw invalid("Choose an active practitioner belonging to this business");practitionerName=assigned.get(0);
            input.put("resource","practitioner:"+practitionerId);
        }else if(!draft&&input.containsKey("practitionerId")&&Set.of("home_visit","checkup","op").contains(kind))throw invalid("Select a practitioner from your business");
        String resource=string(input,"resource",100,true);boolean active=bool(input,"active");
        int travelFee=input.containsKey("travelFee")?number(input,"travelFee",0,100000):0;
        String deliveryMode=input.containsKey("deliveryMode")?string(input,"deliveryMode",30,true):switch(kind){case "home_visit","checkup","delivery"->"home";case "ambulance"->"transport";default->"onsite";};
        if(!Set.of("home","onsite","remote","transport").contains(deliveryMode))throw invalid("Invalid delivery mode");
        Object days=input.getOrDefault("availableDays",List.of(1,2,3,4,5,6,7));
        if(!(days instanceof List<?> dayList)||(!draft&&dayList.isEmpty())||dayList.size()>7||new HashSet<>(dayList).size()!=dayList.size()||dayList.stream().anyMatch(d->!(d instanceof Number n)||n.doubleValue()!=n.intValue()||n.intValue()<1||n.intValue()>7))throw invalid("Choose valid available days");
        // One resource represents a team, vehicle, counter or room. All its services share capacity.
        for(var sibling:catalog(null,null,null,true))if(provider.equals(sibling.get("providerId"))&&!Objects.equals(id,sibling.get("id"))&&resource.equals(sibling.get("resource"))&&capacity!=((Number)sibling.get("capacity")).intValue())throw invalid("Services sharing a resource must use the same capacity");
        if(id!=null){expire(provider);int occupied=db.queryForObject("SELECT COUNT(*) FROM care_requests WHERE service_id=? AND status IN ('pending','accepted','in_progress')",Integer.class,id);if(occupied>0)throw conflict("Finish or cancel open requests before editing this service");}
        var s=new LinkedHashMap<String,Object>();s.put("id",id==null?UUID.randomUUID().toString():id);s.put("providerId",provider);s.put("kind",kind);s.put("title",title);s.put("titleTe",titleTe);s.put("description",description);s.put("fee",fee);s.put("feeOnRequest",feeOnRequest);s.put("totalFee",fee+travelFee);s.put("capacity",capacity);s.put("durationMinutes",duration);s.put("timeWindow",timeWindow);s.put("practitionerId",practitionerId);s.put("practitionerName",practitionerName);s.put("resource",resource);s.put("coverage",coverage);s.put("slots",slots);s.put("active",active);s.put("available",bool(input,"available"));s.put("approval",draft?"draft":"pending");s.put("serviceNotes",input.containsKey("serviceNotes")?string(input,"serviceNotes",300,false):"");s.put("travelFee",travelFee);s.put("deliveryMode",deliveryMode);s.put("availableDays",days);s.put("organization",org.get("organization"));s.put("businessType",business);s.put("phone",org.get("phone"));s.put("updatedAt",System.currentTimeMillis());
        if(id==null)db.update("INSERT INTO care_services(id,provider_id,approval,active,document) VALUES(?,?,?,?,?)",s.get("id"),provider,s.get("approval"),active,store.encode(s));
        else db.update("UPDATE care_services SET approval=?,active=?,document=? WHERE id=?",s.get("approval"),active,store.encode(s),id);
        audit(u,draft?"service.draft":"service.submitted",(String)s.get("id"),title);return s;
    }
    @Transactional public Map<String,Object> review(String id,Map<String,Object> body){
        var u=access.require("admin");var existing=service(id);store.lockEntity((String)existing.get("providerId"));var s=service(id);
        if(!"pending".equals(s.get("approval")))throw conflict("Only pending services can be reviewed");
        String decision=text(body,"decision"),reason=string(body,"reason",1000,true);if(!Set.of("approved","rejected").contains(decision)||reason.length()<5)throw invalid("Choose a decision and give a reason (5-1000 characters)");
        s.put("approval",decision);s.put("reviewReason",reason);db.update("UPDATE care_services SET approval=?,document=? WHERE id=?",decision,store.encode(s),id);audit(u,"service."+decision,id,reason);
        accounts.providerEmail((String)s.get("providerId")).ifPresent(email->notifications.queue(email,"Arogya Mitra service review",s.get("title")+": "+decision+"\n"+reason));return s;
    }
    @Transactional public Map<String,Object> availabilityState(String id,Map<String,Object> body){
        var u=access.current();var original=service(id);String provider=(String)original.get("providerId");access.provider(provider);store.lockEntity(provider);var s=service(id);
        s.put("available",bool(body,"available"));s.put("active",bool(body,"active"));db.update("UPDATE care_services SET active=?,document=? WHERE id=?",s.get("active"),store.encode(s),id);audit(u,"service.availability",id,"available="+s.get("available")+", active="+s.get("active"));return s;
    }
    private LocalDate date(String value){try{LocalDate day=LocalDate.parse(value);LocalDate now=LocalDate.now(ZoneId.of("Asia/Kolkata"));if(!value.equals(day.toString())||day.isBefore(now)||day.isAfter(now.plusDays(30)))throw invalid("Choose a date within 30 days");return day;}catch(java.time.format.DateTimeParseException e){throw invalid("Invalid date");}}
    private void expire(){expire(null);}
    private void expire(String provider){for(var r:db.query("SELECT document FROM care_requests WHERE status='pending' AND expires_at<=? AND (CAST(? AS VARCHAR(80)) IS NULL OR provider_id=?)",(rs,n)->store.decode(rs.getString(1)),System.currentTimeMillis(),provider,provider)){r.put("status","expired");history(r,"expired","system","");db.update("UPDATE care_requests SET status='expired',document=? WHERE id=? AND status='pending' AND expires_at<=?",store.encode(r),r.get("id"),System.currentTimeMillis());}}
    private boolean overlaps(String time,int duration,String other,int otherDuration){int a=LocalTime.parse(time).toSecondOfDay()/60,b=LocalTime.parse(other).toSecondOfDay()/60;return a<b+otherDuration&&b<a+duration;}
    private int used(Map<String,Object> s,String date,String time){
        int count=0,duration=((Number)s.getOrDefault("durationMinutes",30)).intValue();
        for(var r:db.query("SELECT document FROM care_requests WHERE provider_id=? AND request_date=? AND (status IN ('accepted','in_progress') OR (status='pending' AND expires_at>?))",(rs,n)->store.decode(rs.getString(1)),s.get("providerId"),date,System.currentTimeMillis()))
            if(s.get("resource").equals(r.get("resource"))&&overlaps(time,duration,(String)r.get("time"),((Number)r.getOrDefault("durationMinutes",30)).intValue()))count++;
        // Legacy appointments reserve 30 minutes against every organisation resource.
        for(String legacy:db.query("SELECT booking_time FROM bookings WHERE pid=? AND booking_date=? AND (status='confirmed' OR (status='pending' AND expires_at>?))",(rs,n)->rs.getString(1),s.get("providerId"),date,System.currentTimeMillis()))if(overlaps(time,duration,legacy,30))count++;
        return count;
    }
    public Map<String,Object> availability(String id,String day){var s=service(id);if(!visible(s))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Service unavailable");date(day);boolean scheduled=((List<?>)s.getOrDefault("availableDays",List.of(1,2,3,4,5,6,7))).contains(LocalDate.parse(day).getDayOfWeek().getValue());List<Map<String,Object>> slots=new ArrayList<>();for(Object t:(List<?>)s.get("slots")){boolean future=LocalDateTime.parse(day+"T"+t).isAfter(LocalDateTime.now(ZoneId.of("Asia/Kolkata")));slots.add(Map.of("time",t,"remaining",scheduled&&future&&Boolean.TRUE.equals(s.get("available"))?Math.max(0,((Number)s.get("capacity")).intValue()-used(s,day,t.toString())):0));}return Map.of("slots",slots);}
    @Transactional public Map<String,Object> request(Map<String,Object> input){
        var u=access.require("patient");var initial=service(text(input,"serviceId"));store.lockEntity((String)initial.get("providerId"));var s=service((String)initial.get("id"));
        if(!visible(s)||!Boolean.TRUE.equals(s.get("available")))throw conflict("Service is unavailable");
        var patient=patients.get(u.subjectId());if("Guest".equals(patient.get("name"))||patient.getOrDefault("phone","").toString().isBlank())throw invalid("Save your name and phone in Profile before requesting care");
        String day=text(input,"date"),time=text(input,"time"),enteredVillage=text(input,"village").trim(),mode=text(input,"mode");date(day);
        String village=reference.items("villages").stream().filter(v->List.of("id","en","te").stream().anyMatch(k->enteredVillage.equalsIgnoreCase(Objects.toString(v.get(k),"")))).map(v->v.get("id").toString()).findFirst().orElse(enteredVillage);
        if(!((List<?>)s.get("coverage")).contains(village))throw invalid("This provider does not serve the entered village. Check the service coverage.");
        if(!Set.of("visit","callback").contains(mode)||!((List<?>)s.get("coverage")).contains(village)||!((List<?>)s.get("slots")).contains(time)||!LocalDateTime.parse(day+"T"+time).isAfter(LocalDateTime.now(ZoneId.of("Asia/Kolkata"))))throw invalid("Invalid location, mode or slot");
        if(!((List<?>)s.getOrDefault("availableDays",List.of(1,2,3,4,5,6,7))).contains(LocalDate.parse(day).getDayOfWeek().getValue()))throw invalid("Service is not scheduled on this day");
        String address=string(input,"address",300,false),details=string(input,"details",500,false);
        String payment=input.containsKey("paymentPreference")?string(input,"paymentPreference",30,false):"";
        if(!Set.of("","undecided","cash","online").contains(payment))throw invalid("Invalid payment preference");
        Double latitude=null,longitude=null;
        if(input.get("latitude")!=null||input.get("longitude")!=null){
            if(!(input.get("latitude") instanceof Number lat)||!(input.get("longitude") instanceof Number lon))throw invalid("Invalid current location");
            latitude=lat.doubleValue();longitude=lon.doubleValue();
            if(!Double.isFinite(latitude)||!Double.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw invalid("Invalid current location");
        }
        if(Set.of("home_visit","delivery","checkup","ambulance").contains(s.get("kind"))&&address.length()<5)throw invalid("Enter a pickup or home address");
        if(Set.of("medicine","delivery","lab","ambulance").contains(s.get("kind"))&&details.length()<3)throw invalid("Enter medicine, test or ambulance destination details for provider review");
        expire((String)s.get("providerId"));int duplicate=db.queryForObject("SELECT COUNT(*) FROM care_requests WHERE patient_id=? AND service_id=? AND request_date=? AND request_time=? AND status IN ('pending','accepted','in_progress')",Integer.class,u.subjectId(),s.get("id"),day,time);if(duplicate>0)throw conflict("You already have an open request for this slot");
        if(used(s,day,time)>=((Number)s.get("capacity")).intValue())throw conflict("This slot is full. Choose another time");
        var r=new LinkedHashMap<String,Object>();String id=UUID.randomUUID().toString();long now=System.currentTimeMillis(),start=LocalDateTime.parse(day+"T"+time).atZone(ZoneId.of("Asia/Kolkata")).toInstant().toEpochMilli();
        r.put("id",id);r.put("serviceId",s.get("id"));r.put("providerId",s.get("providerId"));r.put("patientId",u.subjectId());r.put("patientName",patient.get("name"));r.put("phone",patient.get("phone"));r.put("kind",s.get("kind"));r.put("title",s.get("title"));r.put("titleTe",s.get("titleTe"));r.put("organization",s.get("organization"));r.put("resource",s.get("resource"));r.put("practitionerId",s.getOrDefault("practitionerId",""));r.put("practitionerName",s.getOrDefault("practitionerName",""));r.put("durationMinutes",s.getOrDefault("durationMinutes",30));r.put("fee",((Number)s.get("fee")).intValue()+((Number)s.getOrDefault("travelFee",0)).intValue());r.put("travelFee",s.getOrDefault("travelFee",0));r.put("deliveryMode",s.getOrDefault("deliveryMode","onsite"));r.put("feeOnRequest",s.getOrDefault("feeOnRequest",false));r.put("date",day);r.put("time",time);r.put("village",village);r.put("mode",mode);r.put("address",address);r.put("details",details);r.put("status","pending");r.put("createdAt",now);r.put("expiresAt",Math.min(now+1800000,start));r.put("history",new ArrayList<>());history(r,"pending",u.subjectId(),"");
        r.put("paymentPreference",payment);r.put("paymentStatus","not_collected");
        if(latitude!=null){r.put("latitude",latitude);r.put("longitude",longitude);}
        db.update("INSERT INTO care_requests(id,service_id,provider_id,patient_id,request_date,request_time,status,expires_at,created_at,document) VALUES(?,?,?,?,?,?,'pending',?,?,?)",id,s.get("id"),s.get("providerId"),u.subjectId(),day,time,r.get("expiresAt"),now,store.encode(r));
        accounts.providerEmail((String)s.get("providerId")).ifPresent(email->notifications.queue(email,"Arogya Mitra service request",s.get("title")+" requested for "+day+" "+time+" (Asia/Kolkata). Sign in to review. Not confirmed until you accept. Pending requests expire within 30 minutes."));return r;
    }
    public List<Map<String,Object>> requests(){var u=access.current();expire();return db.query("SELECT document FROM care_requests WHERE (?='admin' OR (?='provider' AND provider_id=?) OR (?='patient' AND patient_id=?)) ORDER BY created_at DESC",(r,n)->store.decode(r.getString(1)),u.role(),u.role(),u.subjectId(),u.role(),u.subjectId());}
    @SuppressWarnings("unchecked") private void history(Map<String,Object> r,String status,String actor,String note){var h=new ArrayList<>((List<Object>)r.get("history"));h.add(Map.of("status",status,"actor",actor,"note",note,"at",System.currentTimeMillis()));r.put("history",h);}
    @Transactional public Map<String,Object> transition(String id,Map<String,Object> body){
        var u=access.current();var rows=db.query("SELECT document FROM care_requests WHERE id=?",(r,n)->store.decode(r.getString(1)),id);if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Request not found");
        var r=rows.get(0);boolean provider=u.role().equals("provider")&&u.subjectId().equals(r.get("providerId")),patient=u.role().equals("patient")&&u.subjectId().equals(r.get("patientId"));if(!provider&&!patient&&!u.role().equals("admin"))throw access.forbidden();
        store.lockEntity((String)r.get("providerId"));expire((String)r.get("providerId"));r=db.query("SELECT document FROM care_requests WHERE id=? FOR UPDATE",(rs,n)->store.decode(rs.getString(1)),id).get(0);
        String next=text(body,"status"),current=(String)r.get("status"),note=string(body,"note",500,false);
        boolean allowed=provider&&((current.equals("pending")&&Set.of("accepted","rejected").contains(next))||(current.equals("accepted")&&Set.of("in_progress","cancelled").contains(next))||(current.equals("in_progress")&&Set.of("completed","cancelled").contains(next)));
        allowed|=patient&&Set.of("pending","accepted").contains(current)&&next.equals("cancelled");
        allowed|=u.role().equals("admin")&&Set.of("pending","accepted","in_progress").contains(current)&&next.equals("cancelled");
        if(!allowed)throw conflict("Invalid request status transition");if(Set.of("rejected","cancelled").contains(next)&&note.length()<5)throw invalid("Give a reason (at least 5 characters)");
        if(next.equals("accepted")&&(!visible(service((String)r.get("serviceId")))||!accounts.publicProvider((String)r.get("providerId"))))throw conflict("Service is no longer active");
        if(next.equals("in_progress")&&LocalDateTime.parse(r.get("date")+"T"+r.get("time")).isAfter(LocalDateTime.now(ZoneId.of("Asia/Kolkata"))))throw conflict("The scheduled time has not started");
        r.put("status",next);history(r,next,u.subjectId(),note);db.update("UPDATE care_requests SET status=?,document=? WHERE id=?",next,store.encode(r),id);audit(u,"request."+next,id,note);final String reference=id;accounts.providerEmail((String)r.get("providerId")).ifPresent(email->notifications.queue(email,"Arogya Mitra request update","Request "+reference+" changed to "+next+". Sign in to view its history."));return r;
    }
    public List<Map<String,Object>> organisations(){access.require("admin");return db.query("SELECT a.id,a.username,a.email,a.active,a.suspended,a.subject_id,a.display_name FROM accounts a WHERE a.role='provider' ORDER BY a.created_at",(r,n)->Map.of("id",r.getString(1),"username",r.getString(2),"email",r.getString(3),"active",r.getBoolean(4),"suspended",r.getBoolean(5),"providerId",r.getString(6),"name",r.getString(7)));}
    @Transactional public void suspend(String provider,Map<String,Object> body){var u=access.require("admin");store.lockEntity(provider);boolean suspended=bool(body,"suspended");String reason=string(body,"reason",500,true);if(reason.length()<5)throw invalid("Give a reason");int n=db.update("UPDATE accounts SET suspended=?,credential_version=credential_version+1 WHERE subject_id=? AND role='provider'",suspended,provider);if(n==0)throw invalid("Organisation not found");db.update("UPDATE activation_tokens SET used=TRUE WHERE account_id IN (SELECT id FROM accounts WHERE subject_id=?)",provider);bridge.syncOrganisation(provider);audit(u,suspended?"organisation.suspended":"organisation.reactivated",provider,reason);}
    public List<Map<String,Object>> staffList(){var u=access.current();if(!Set.of("admin","provider").contains(u.role()))throw access.forbidden();return db.query("SELECT id,username,display_name,email,active,suspended,subject_id FROM accounts WHERE role='provider'"+(u.role().equals("provider")?" AND subject_id=?":"")+" ORDER BY created_at",(r,n)->Map.<String,Object>of("id",r.getString(1),"username",r.getString(2),"name",r.getString(3),"email",r.getString(4),"active",r.getBoolean(5),"suspended",r.getBoolean(6),"providerId",r.getString(7)),u.role().equals("provider")?new Object[]{u.subjectId()}:new Object[]{});}
    @Transactional public void staff(Map<String,Object> body){var u=access.current();if(!Set.of("admin","provider").contains(u.role()))throw access.forbidden();String provider=u.role().equals("provider")?u.subjectId():text(body,"providerId");if(body.containsKey("providerId")&&!provider.equals(body.get("providerId")))throw access.forbidden();store.lockEntity(provider);if(db.queryForObject("SELECT COUNT(*) FROM accounts WHERE subject_id=? AND active=TRUE AND suspended=FALSE AND registration_status='approved' AND must_change_password=FALSE",Integer.class,provider)==0)throw conflict("Organisation account must be approved and active");String username=text(body,"username").toLowerCase(Locale.ROOT),email=text(body,"email").toLowerCase(Locale.ROOT),name=text(body,"name");if(!username.matches("[a-z0-9_.-]{3,50}")||!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))throw invalid("Invalid staff username or email");String id=UUID.randomUUID().toString();accounts.create(id,username,email,null,"provider",provider,name,false);activation.issue(id,email,"You have been invited to the organisation. Your access is restricted to its records.");audit(u,"staff.invited",provider,username);}
    private void audit(Identity u,String action,String id,String detail){db.update("INSERT INTO audit_events(id,actor_id,action,resource_id,detail,created_at) VALUES(?,?,?,?,?,?)",UUID.randomUUID().toString(),u.accountId().isBlank()?u.subjectId():u.accountId(),action,id,detail,System.currentTimeMillis());}
}
