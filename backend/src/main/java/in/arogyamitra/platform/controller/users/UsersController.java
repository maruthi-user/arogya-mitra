package in.arogyamitra.platform.controller.users;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import in.arogyamitra.platform.dto.users.UserDto;
import in.arogyamitra.platform.enums.UserStatus;
import in.arogyamitra.platform.service.auth.SessionService;
import in.arogyamitra.platform.service.users.UserService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/v1/users")
public class UsersController {

    private final UserService users;
    private final SessionService sessions;
    private final int maxFailedAttempts;

    public UsersController(UserService users, SessionService sessions,
            @Value("${app.security.max-failed-attempts:5}") int maxFailedAttempts) {
        this.users = users;
        this.sessions = sessions;
        this.maxFailedAttempts = maxFailedAttempts;
    }

    public record CreateUserRequest(
            @NotBlank @Pattern(regexp = UserService.USERNAME_PATTERN, message = UserService.USERNAME_MESSAGE) String username,
            @NotBlank @Email @Size(max = 150) String email,
            @NotBlank String role,
            @NotBlank String password) {
    }

    public record UpdateUserRequest(@Email @Size(max = 150) String email, String role, UserStatus status) {
    }

    @GetMapping
    @PreAuthorize("@perm.has('users.view')")
    public Page<UserDto> list(@RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by("username"));
        return users.search(q, pageable).map(u -> UserDto.from(u, maxFailedAttempts));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@perm.has('users.view')")
    public UserDto get(@PathVariable Long id) {
        return UserDto.from(users.get(id), maxFailedAttempts);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perm.has('users.manage')")
    public UserDto create(@Valid @RequestBody CreateUserRequest request) {
        return UserDto.from(users.create(request.username(), request.email(), request.role(), request.password()),
                maxFailedAttempts);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("@perm.has('users.manage')")
    public UserDto update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {
        return UserDto.from(users.update(id, request.email(), request.role(), request.status()),
                maxFailedAttempts);
    }

    @PostMapping("/{id}/unlock")
    @PreAuthorize("@perm.has('users.manage')")
    public void unlock(@PathVariable Long id) {
        users.unlock(id);
    }

    /** Signs the user out on every device (e.g. a lost laptop). */
    @PostMapping("/{id}/sessions/revoke")
    @PreAuthorize("@perm.has('users.manage')")
    public Map<String, Object> revokeSessions(@PathVariable Long id) {
        users.get(id); // 404 for an unknown id
        return Map.of("revoked", sessions.revokeAll(id, null, SessionService.REASON_ADMIN));
    }
}
