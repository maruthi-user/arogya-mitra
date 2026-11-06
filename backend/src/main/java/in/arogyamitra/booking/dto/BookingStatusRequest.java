package in.arogyamitra.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Body of PATCH /api/bookings/{id}. Who may make which change is checked in BookingService. */
public record BookingStatusRequest(
        @NotBlank(message = "Invalid status")
                @Pattern(
                        regexp = "confirmed|declined|cancelled|done|no_show",
                        message = "Invalid status")
                String status) {}
