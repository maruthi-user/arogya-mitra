package in.arogyamitra.registration.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;

/**
 * Typed request bodies for the onboarding review endpoints. Business rules stay in
 * ProviderApplicationService.
 */
public final class OnboardingRequests {
    private OnboardingRequests() {}

    private static final String DECISION = "approved|rejected";
    private static final String DECISION_MESSAGE = "Decision must be approved or rejected";

    /**
     * Admin's final decision (step 2). A reason is required for rejection; that rule is checked in
     * the service.
     */
    public record ReviewRequest(
            @NotBlank(message = DECISION_MESSAGE)
                    @Pattern(regexp = DECISION, message = DECISION_MESSAGE)
                    String decision,
            @Size(max = 1000, message = "Reason must be at most 1000 characters") String reason) {}

    /**
     * Verifier's decision (step 1). {@code checks} must confirm every verification check to
     * forward.
     */
    public record VerifyRequest(
            @NotBlank(message = DECISION_MESSAGE)
                    @Pattern(regexp = DECISION, message = DECISION_MESSAGE)
                    String decision,
            @Size(max = 1000, message = "Reason must be at most 1000 characters") String reason,
            Map<String, Boolean> checks) {}

    public record CreateVerifierRequest(
            @NotBlank(message = "Enter the verifier's full name (2-80 characters)")
                    @Size(
                            min = 2,
                            max = 80,
                            message = "Enter the verifier's full name (2-80 characters)")
                    String name,
            @NotBlank(message = "Enter a valid email address")
                    @Email(message = "Enter a valid email address")
                    @Size(max = 100, message = "Enter a valid email address")
                    String email) {}

    public record UpdateVerifierRequest(
            @NotNull(message = "Choose whether the verifier is suspended") Boolean suspended) {}
}
