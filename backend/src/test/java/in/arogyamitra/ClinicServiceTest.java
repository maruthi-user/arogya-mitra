package in.arogyamitra;
import in.arogyamitra.compatibility.ClinicService;

import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={"spring.datasource.url=jdbc:h2:mem:test;DB_CLOSE_DELAY=-1","app.seed-demo=true","app.notifications.scheduling=false"})
class ClinicServiceTest {
    @Autowired ClinicService service;
    @Autowired TestRestTemplate http;
    @Autowired org.springframework.jdbc.core.JdbcTemplate db;
    @Test void httpContractAndValidation() {
        var response = http.getForEntity("/api/state", Map.class);
        assertEquals(HttpStatus.OK,response.getStatusCode());
        assertTrue(response.getBody().containsKey("providers"));
        var invalid = http.postForEntity("/api/bookings",Map.of("pid","p1"),Map.class);
        assertEquals(HttpStatus.FORBIDDEN,invalid.getStatusCode());
        assertTrue(invalid.getBody().containsKey("message"));
    }
    Map<String,Object> input(String pid, String time) {
        return Map.of("pid",pid,"date",LocalDate.now(ZoneId.of("Asia/Kolkata")).plusDays(1).toString(),"time",time,"name","Test","village","rama","patientId","demo-patient","reason","");
    }
    @Test void conflictCancelAndRebook() {
        var input = input("p1","10:00");
        var booking = service.book(input);
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.book(input)).getStatusCode().value());
        service.status((String)booking.get("id"),"cancelled",Map.of("role","patient","id","demo-patient"));
        assertNotNull(service.book(input).get("id"));
        assertThrows(ResponseStatusException.class,()->service.book(input("p1","03:00")));
    }
    @Test void onlyOneConcurrentBookingSucceeds() throws Exception {
        var pool = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        Callable<Integer> task = () -> {
            start.await();
            try { service.book(input("p2","16:00")); return 201; }
            catch (ResponseStatusException e) { return e.getStatusCode().value(); }
        };
        try {
            var a = pool.submit(task); var b = pool.submit(task); start.countDown();
            var results = new ArrayList<>(List.of(a.get(10,TimeUnit.SECONDS),b.get(10,TimeUnit.SECONDS)));
            Collections.sort(results); assertEquals(List.of(201,409),results);
        } finally { pool.shutdownNow(); }
    }
    @Test void providerAndStockUpdatesPersist() {
        service.open("p3",true); service.stock("s1","para",false);
        assertThrows(ResponseStatusException.class,()->service.stock("p1","para",true));
        assertThrows(ResponseStatusException.class,()->service.stock("s1","unknown",true));
        assertNotNull(service.state().get("pharmacies"));
    }
    @Test void providerApprovalAndOwnershipRules() {
        var request=service.book(input("p4","15:00"));
        String id=(String)request.get("id");
        assertEquals("pending",request.get("status"));
        assertThrows(ResponseStatusException.class,()->service.status(id,"confirmed",Map.of("role","provider","id","p1")));
        assertThrows(ResponseStatusException.class,()->service.status(id,"done",Map.of("role","provider","id","p4")));
        service.status(id,"confirmed",Map.of("role","provider","id","p4"));
        assertThrows(ResponseStatusException.class,()->service.status(id,"done",Map.of("role","provider","id","p4")));
        assertThrows(ResponseStatusException.class,()->service.status(id,"cancelled",Map.of("role","patient","id","demo-patient-2")));
        service.status(id,"cancelled",Map.of("role","patient","id","demo-patient"));
        assertThrows(ResponseStatusException.class,()->service.status(id,"confirmed",Map.of("role","provider","id","p4")));
    }
    @Test void expiryReleasesSlotAndDeclineAllowsRebooking() {
        var request=service.book(input("p5","17:00"));
        db.update("UPDATE bookings SET expires_at=0 WHERE id=?",request.get("id"));
        service.state();
        assertEquals("expired",db.queryForObject("SELECT status FROM bookings WHERE id=?",String.class,request.get("id")));
        var next=service.book(input("p5","17:00"));
        service.status((String)next.get("id"),"declined",Map.of("role","provider","id","p5"));
        assertNotNull(service.book(input("p5","17:00")).get("id"));
    }
    @Test void editedScheduleIsUsedForNewRequests() {
        service.profile("p3",Map.of("slots",List.of("13:30"),"fee",250,"services","Sample consultation"));
        assertNotNull(service.book(input("p3","13:30")).get("id"));
        assertThrows(ResponseStatusException.class,()->service.book(input("p3","09:00")));
        assertThrows(ResponseStatusException.class,()->service.profile("p3",Map.of("slots",List.of("25:00"),"fee",0,"services","")));
    }
}
