package in.arogyamitra.registration;

import in.arogyamitra.registration.dto.OnboardingRequests.VerifyRequest;
import in.arogyamitra.security.AccessService;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Step 1 of provider onboarding. Administrators may act here too, as HRMS admins can take the Team
 * Lead action.
 */
@RestController
@RequestMapping("/api/verification")
class VerificationController {
    private final ProviderApplicationService applications;
    private final ApplicationDocuments documents;
    private final AccessService access;

    VerificationController(
            ProviderApplicationService applications,
            ApplicationDocuments documents,
            AccessService access) {
        this.applications = applications;
        this.documents = documents;
        this.access = access;
    }

    @GetMapping("/applications")
    public List<Map<String, Object>> applications() {
        access.requireAny("verifier", "admin");
        return applications.list();
    }

    @PostMapping("/applications/{id}/verify")
    public Map<String, Object> verify(
            @PathVariable String id, @Valid @RequestBody VerifyRequest body) {
        var user = access.requireAny("verifier", "admin");
        return applications.verify(
                id,
                body.decision(),
                body.reason(),
                body.checks() == null ? Map.of() : body.checks(),
                user.accountId());
    }

    @GetMapping("/applications/{id}/history")
    public List<Map<String, Object>> history(@PathVariable String id) {
        access.requireAny("verifier", "admin");
        return applications.history(id);
    }

    @GetMapping("/applications/{id}/documents")
    public List<Map<String, Object>> documents(@PathVariable String id) {
        access.requireAny("verifier", "admin");
        return documents.list(id);
    }

    @GetMapping("/documents/{id}")
    public ResponseEntity<byte[]> download(@PathVariable String id) {
        access.requireAny("verifier", "admin");
        return documents.downloadApplicationDocument(id);
    }
}
