package in.arogyamitra.platform.controller.auth;

import java.time.Duration;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import in.arogyamitra.platform.config.ConditionalOnAppModule;
import in.arogyamitra.platform.security.RateLimiter;
import in.arogyamitra.platform.service.auth.PasswordResetService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

/** Both endpoints are public (see SecurityConfiguration.PUBLIC_PATHS) and rate limited per client IP. */
@RestController
@RequestMapping("/api/v1/auth")
@ConditionalOnAppModule("passwordreset")
public class PasswordResetController {

    public record ForgotPasswordRequest(@NotBlank String email) {
    }

    public record ResetPasswordRequest(@NotBlank String token, @NotBlank String newPassword) {
    }

    private final PasswordResetService reset;
    private final RateLimiter rateLimiter;
    private final int maxAttempts;
    private final Duration window;

    public PasswordResetController(PasswordResetService reset, RateLimiter rateLimiter,
            @Value("${app.rate-limit.password.max-attempts:5}") int maxAttempts,
            @Value("${app.rate-limit.password.window:15m}") Duration window) {
        this.reset = reset;
        this.rateLimiter = rateLimiter;
        this.maxAttempts = maxAttempts;
        this.window = window;
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> forgot(@Valid @RequestBody ForgotPasswordRequest request, HttpServletRequest http) {
        rateLimiter.consume("forgot-password:" + http.getRemoteAddr(), maxAttempts, window);
        reset.requestReset(request.email());
        // identical answer for known and unknown addresses
        return Map.of("message", "If an account exists for this address, a reset link has been sent.");
    }

    @PostMapping("/reset-password")
    public Map<String, String> reset(@Valid @RequestBody ResetPasswordRequest request, HttpServletRequest http) {
        rateLimiter.consume("reset-password:" + http.getRemoteAddr(), maxAttempts, window);
        reset.reset(request.token(), request.newPassword());
        return Map.of("message", "Your password has been changed. You can log in now.");
    }
}
