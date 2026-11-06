package in.arogyamitra.platform.service.users;

import in.arogyamitra.platform.config.AppConfig;
import in.arogyamitra.platform.entity.users.AppUser;
import in.arogyamitra.platform.enums.UserStatus;
import in.arogyamitra.platform.exception.BadRequestException;
import in.arogyamitra.platform.exception.DuplicateRequestException;
import in.arogyamitra.platform.exception.ResourceNotFoundException;
import in.arogyamitra.platform.repository.users.AppUserRepository;
import in.arogyamitra.platform.service.auth.SessionService;
import in.arogyamitra.platform.spi.AuditEvent;
import in.arogyamitra.platform.spi.UserRef;
import in.arogyamitra.platform.spi.UserRefResolver;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService implements UserRefResolver {

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final AppConfig config;
    private final ApplicationEventPublisher events;
    private final SessionService sessions;

    public UserService(
            AppUserRepository users,
            PasswordEncoder encoder,
            AppConfig config,
            ApplicationEventPublisher events,
            SessionService sessions) {
        this.users = users;
        this.encoder = encoder;
        this.config = config;
        this.events = events;
        this.sessions = sessions;
    }

    /**
     * Letters, digits, dot, underscore, dash; 3 to 50 characters. No '@', so a username is never
     * mistaken for an email.
     */
    public static final String USERNAME_PATTERN = "[A-Za-z0-9._-]{3,50}";

    public static final String USERNAME_MESSAGE =
            "username must be 3-50 characters: letters, digits, '.', '_' or '-'";

    @Transactional
    public AppUser create(String username, String email, String role, String rawPassword) {
        PasswordPolicy.check(rawPassword);
        return createWithHash(username, email, role, encoder.encode(rawPassword));
    }

    /** For flows that already hold a password hash. */
    @Transactional
    public AppUser createWithHash(String username, String email, String role, String passwordHash) {
        String normalizedUsername = normalizeUsername(username);
        String normalizedEmail = normalize(email);
        if (normalizedUsername == null || !normalizedUsername.matches(USERNAME_PATTERN)) {
            throw new BadRequestException(USERNAME_MESSAGE + ".");
        }
        if (!config.roleExists(role)) {
            throw new BadRequestException("Unknown role '" + role + "'.");
        }
        if (users.existsByUsernameIgnoreCase(normalizedUsername)) {
            throw new DuplicateRequestException("A user with this username already exists.");
        }
        if (users.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateRequestException("A user with this email already exists.");
        }
        AppUser saved =
                users.save(new AppUser(normalizedUsername, normalizedEmail, passwordHash, role));
        events.publishEvent(AuditEvent.of("User", saved.getId(), "CREATED", Map.of("role", role)));
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<AppUser> search(String query, Pageable pageable) {
        String like =
                query == null || query.isBlank()
                        ? null
                        : "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
        return like == null ? users.findAll(pageable) : users.search(like, pageable);
    }

    @Transactional(readOnly = true)
    public AppUser get(Long id) {
        return users.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User " + id + " not found."));
    }

    @Transactional
    public AppUser update(Long id, String email, String role, UserStatus status) {
        AppUser user = get(id);
        if (email != null && !email.isBlank()) {
            String normalized = normalize(email);
            if (!normalized.equalsIgnoreCase(user.getEmail())
                    && users.existsByEmailIgnoreCase(normalized)) {
                throw new DuplicateRequestException("A user with this email already exists.");
            }
            user.setEmail(normalized);
        }
        if (role != null) {
            if (!config.roleExists(role)) {
                throw new BadRequestException("Unknown role '" + role + "'.");
            }
            user.setRole(role);
        }
        if (status != null) {
            if (status != UserStatus.ACTIVE && user.getStatus() == UserStatus.ACTIVE) {
                sessions.revokeAll(id, null, SessionService.REASON_DEACTIVATED);
            }
            user.setStatus(status);
        }
        events.publishEvent(
                AuditEvent.of(
                        "User",
                        id,
                        "UPDATED",
                        Map.of("role", user.getRole(), "status", user.getStatus().name())));
        return users.save(user);
    }

    @Transactional
    public void unlock(Long id) {
        AppUser user = get(id);
        user.setFailedAttempts(0);
        users.save(user);
        events.publishEvent(AuditEvent.of("User", id, "UNLOCKED"));
    }

    /**
     * Ends every other session of the user; keepSessionId (the device making the change) stays
     * signed in.
     */
    @Transactional
    public void changePassword(
            Long id, String currentPassword, String newPassword, String keepSessionId) {
        AppUser user = get(id);
        if (!encoder.matches(currentPassword, user.getPassword())) {
            throw new BadRequestException("Current password is incorrect.");
        }
        PasswordPolicy.check(newPassword);
        user.setPasswordHash(encoder.encode(newPassword));
        users.save(user);
        sessions.revokeAll(id, keepSessionId, SessionService.REASON_PASSWORD_CHANGED);
        events.publishEvent(AuditEvent.of("User", id, "PASSWORD_CHANGED"));
    }

    @Transactional(readOnly = true)
    public Optional<AppUser> findActiveByEmail(String email) {
        return users.findByEmailIgnoreCase(normalize(email))
                .filter(u -> u.getStatus() == UserStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public Optional<AppUser> findActiveById(Long id) {
        return users.findById(id).filter(u -> u.getStatus() == UserStatus.ACTIVE);
    }

    /**
     * Sets a new password without asking for the old one; also clears a lockout and ends every
     * session. The caller proves identity.
     */
    @Transactional
    public void resetPassword(Long id, String newPassword) {
        PasswordPolicy.check(newPassword);
        AppUser user = get(id);
        user.setPasswordHash(encoder.encode(newPassword));
        user.setFailedAttempts(0);
        users.save(user);
        sessions.revokeAll(id, null, SessionService.REASON_PASSWORD_RESET);
        events.publishEvent(AuditEvent.of("User", id, "PASSWORD_RESET"));
    }

    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        return users.existsByEmailIgnoreCase(normalize(email));
    }

    public boolean isEmpty() {
        return users.count() == 0;
    }

    /** The user with this username or e-mail address (whichever the person typed). */
    @Transactional(readOnly = true)
    public Optional<AppUser> findByLogin(String login) {
        if (login == null || login.isBlank()) {
            return Optional.empty();
        }
        String value = login.trim();
        return value.contains("@")
                ? users.findByEmailIgnoreCase(normalize(value))
                : users.findByUsernameIgnoreCase(normalizeUsername(value));
    }

    public static String normalizeUsername(String username) {
        return username == null ? null : username.trim().toLowerCase(Locale.ROOT);
    }

    public static String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    // ---- UserRefResolver ----

    @Override
    @Transactional(readOnly = true)
    public Optional<UserRef> find(Long id) {
        return id == null ? Optional.empty() : users.findById(id).map(u -> (UserRef) u);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserRef> findActiveByRole(String role) {
        return users.findByRoleAndStatus(role, UserStatus.ACTIVE).stream()
                .map(u -> (UserRef) u)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Long, UserRef> findAll(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        return users.findByIdIn(ids).stream()
                .collect(Collectors.toMap(AppUser::getId, u -> (UserRef) u));
    }
}
