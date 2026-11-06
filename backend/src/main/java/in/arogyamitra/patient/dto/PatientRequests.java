package in.arogyamitra.patient.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.HashMap;
import java.util.Map;

/**
 * Typed request bodies for patient registration and profile changes. Village names and the password
 * policy are still checked in the services, which also own the business rules.
 */
public final class PatientRequests {
    private PatientRequests() {}

    private static final String PHONE = "(?:\\+91)?[6-9]\\d{9}";
    private static final String PHONE_MESSAGE = "Enter a valid 10-digit mobile number";

    /** POST /api/auth/patients/register */
    public record RegisterPatientRequest(
            @NotBlank(message = "Enter your name") @Size(max = 40, message = "Name is too long")
                    String name,
            @NotBlank(message = PHONE_MESSAGE) @Pattern(regexp = PHONE, message = PHONE_MESSAGE)
                    String phone,
            @NotBlank(message = "Choose your village") @Size(max = 40, message = "Invalid village")
                    String village,
            @NotBlank(message = "Enter a password")
                    @Size(max = 72, message = "Password must be at most 72 characters")
                    String password,
            @NotBlank(message = "Confirm your password") String confirmPassword,
            @Pattern(regexp = "te|en", message = "Language must be te or en") String language) {
        public Map<String, Object> toInput() {
            var input = new HashMap<String, Object>();
            input.put("name", name.trim());
            input.put("phone", phone.trim());
            input.put("village", village);
            input.put("password", password);
            input.put("confirmPassword", confirmPassword);
            if (language != null) input.put("language", language);
            return input;
        }
    }

    /** PATCH /api/patients/{id}: only the fields that are sent are changed. */
    public record UpdatePatientRequest(
            @Size(min = 1, max = 40, message = "Name must be 1 to 40 characters") String name,
            @Size(min = 1, max = 40, message = "Invalid village") String village,
            @Pattern(regexp = "te|en", message = "Language must be te or en") String language,
            @Pattern(regexp = "|" + PHONE, message = "Enter a valid phone number") String phone) {
        public Map<String, Object> toChanges() {
            var changes = new HashMap<String, Object>();
            if (name != null) changes.put("name", name.trim());
            if (village != null) changes.put("village", village);
            if (language != null) changes.put("language", language);
            if (phone != null) changes.put("phone", phone.trim());
            return changes;
        }
    }
}
