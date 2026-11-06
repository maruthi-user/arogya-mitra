package in.arogyamitra.provider;

import java.util.Map;
import org.springframework.web.bind.annotation.*;

/** Provider business onboarding: draft, submit, admin review and document download. */
@RestController
@RequestMapping("/api/onboarding")
class BusinessOnboardingController {
    private final BusinessOnboardingService service;

    BusinessOnboardingController(BusinessOnboardingService service) {
        this.service = service;
    }

    @GetMapping("/businesses/{id}")
    public Object get(@PathVariable String id) {
        return service.profile(id);
    }

    @PutMapping("/businesses/{id}")
    public Object save(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return service.save(id, body);
    }

    @PostMapping("/businesses/{id}/submit")
    public Object submit(@PathVariable String id) {
        return service.submit(id);
    }

    @GetMapping("/businesses")
    public Object queue() {
        return service.queue();
    }

    @PostMapping("/businesses/{id}/review")
    public Object review(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return service.review(id, body);
    }

    @GetMapping("/businesses/{id}/documents/{document}")
    public Object download(@PathVariable String id, @PathVariable String document) {
        return service.download(id, document);
    }

    @GetMapping("/notifications")
    public Object notifications() {
        return service.notifications();
    }
}
