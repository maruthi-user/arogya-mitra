package in.arogyamitra.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Typed request bodies for /api/auth. JSON field names match what the frontend already sends.
 * BCrypt only reads the first 72 bytes of a password, so passwords are capped at 72 characters here
 * and the byte length is checked again where the password is used.
 */
public final class AuthRequests {
    private AuthRequests() {}

    public record LoginRequest(
            @NotBlank(message = "Username is required")
                    @Size(max = 100, message = "Username is too long")
                    String username,
            @NotBlank(message = "Password is required")
                    @Size(max = 72, message = "Invalid password")
                    String password,
            @NotBlank(message = "Role is required")
                    @Pattern(regexp = "patient|provider|admin|verifier", message = "Invalid role")
                    String role) {}

    public record GuestRequest(
            @Pattern(regexp = "te|en", message = "Language must be te or en") String language) {}

    public record ChangeInitialPasswordRequest(
            @NotBlank(message = "Current and new password are required") String currentPassword,
            @NotBlank(message = "Current and new password are required")
                    @Size(max = 72, message = "Password must be at most 72 characters")
                    String newPassword) {}

    public record ActivateRequest(
            @NotBlank(message = "Invalid token") @Size(max = 100, message = "Invalid token")
                    String token,
            @NotBlank(message = "Password required")
                    @Size(max = 72, message = "Password must be at most 72 characters")
                    String password) {}

    public record SetupRequest(
            @NotBlank(message = "Email is required")
                    @Email(message = "Enter a valid email")
                    @Size(max = 254, message = "Email is too long")
                    String email) {}
}
