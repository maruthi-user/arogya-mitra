package in.arogyamitra.platform.dto.users;

import in.arogyamitra.platform.entity.users.AppUser;
import java.time.LocalDateTime;

public record UserDto(
        Long id,
        String username,
        String email,
        String role,
        String status,
        boolean locked,
        LocalDateTime lastLoginAt) {

    public static UserDto from(AppUser u, int maxFailedAttempts) {
        return new UserDto(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                u.getRole(),
                u.getStatus().name(),
                u.getFailedAttempts() >= maxFailedAttempts,
                u.getLastLoginAt());
    }
}
