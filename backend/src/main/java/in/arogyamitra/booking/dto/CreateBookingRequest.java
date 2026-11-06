package in.arogyamitra.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.*;

/**
 * Body of POST /api/bookings. Existing JSON field names are retained for frontend and Postman
 * compatibility. The patient, name and village are taken from the signed-in patient's profile, so
 * {@code patientId}, {@code name} and {@code village} in the body are ignored. Slot and date rules
 * are checked in BookingService.
 */
public record CreateBookingRequest(
        @NotBlank(message = "Choose a provider") @Size(max = 80, message = "Invalid provider")
                String pid,
        String patientId,
        @NotBlank(message = "Choose a date")
                @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "Invalid date")
                String date,
        @NotBlank(message = "Choose a time")
                @Pattern(regexp = "\\d{2}:\\d{2}", message = "Invalid time")
                String time,
        String name,
        String village,
        @Size(max = 300, message = "Reason must be at most 300 characters") String reason) {
    public Map<String, Object> toInput() {
        var fields = new LinkedHashMap<String, Object>();
        fields.put("pid", pid);
        fields.put("patientId", patientId);
        fields.put("date", date);
        fields.put("time", time);
        fields.put("name", name);
        fields.put("village", village);
        fields.put("reason", reason == null ? "" : reason);
        return fields;
    }
}
