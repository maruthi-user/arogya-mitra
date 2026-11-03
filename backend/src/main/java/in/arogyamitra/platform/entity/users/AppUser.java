package in.arogyamitra.platform.entity.users;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import in.arogyamitra.platform.enums.UserStatus;
import in.arogyamitra.platform.spi.UserRef;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * The one core user. Deliberately small: identity, role key and status. Anything company specific
 * (employee id, branch, phone ...) belongs in the application's own table keyed by this id.
 */
@Entity
@Table(name = "APP_USERS")
public class AppUser implements UserDetails, UserRef {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "EMAIL", unique = true, nullable = false, length = 150)
    private String email;

    @Column(name = "PASSWORD", nullable = false)
    private String password;

    /** Login handle and display name. Lower case, unique. */
    @Column(name = "USERNAME", unique = true, nullable = false, length = 50)
    private String username;

    /** Role key from app-config.json, e.g. ADMIN. */
    @Column(name = "ROLE", nullable = false, length = 50)
    private String role;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "FAILED_ATTEMPTS", nullable = false)
    private int failedAttempts;

    @Column(name = "LAST_LOGIN_AT")
    private LocalDateTime lastLoginAt;

    @CreationTimestamp
    @Column(name = "CREATED_AT", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "UPDATED_AT")
    private LocalDateTime updatedAt;

    protected AppUser() {
    }

    public AppUser(String username, String email, String passwordHash, String role) {
        this.email = email;
        this.password = passwordHash;
        this.username = username;
        this.role = role;
    }

    @Override
    public Long getId() {
        return id;
    }

    @Override
    public String getEmail() {
        return email;
    }

    @Override
    public String getDisplayName() {
        return username;
    }

    @Override
    public String getUsername() {
        return username;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    @Override
    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public int getFailedAttempts() {
        return failedAttempts;
    }

    public void setFailedAttempts(int failedAttempts) {
        this.failedAttempts = failedAttempts;
    }

    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(LocalDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public void setPasswordHash(String passwordHash) {
        this.password = passwordHash;
    }

    // ---- UserDetails ----

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public boolean isEnabled() {
        return status == UserStatus.ACTIVE;
    }
}
