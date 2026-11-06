package in.arogyamitra.registration;

import static in.arogyamitra.shared.ApiInput.*;

import in.arogyamitra.auth.AccountRepository;
import in.arogyamitra.auth.ActivationService;
import in.arogyamitra.auth.PlatformAccountBridge;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Verifier accounts: the first reviewers of provider applications (the HRMS Team Lead step). Only
 * an administrator creates them; each verifier sets their own password from an emailed link.
 */
@Service
public class VerifierService {
    private final JdbcTemplate db;
    private final AccountRepository accounts;
    private final ActivationService activation;
    private final PlatformAccountBridge bridge;
    private final ProviderApplicationService applications;

    public VerifierService(
            JdbcTemplate db,
            AccountRepository accounts,
            ActivationService activation,
            PlatformAccountBridge bridge,
            ProviderApplicationService applications) {
        this.db = db;
        this.accounts = accounts;
        this.activation = activation;
        this.bridge = bridge;
        this.applications = applications;
    }

    public List<Map<String, Object>> list() {
        return db.query(
                "SELECT id,username,email,display_name,active,suspended,created_at FROM accounts WHERE role='verifier' ORDER BY created_at DESC",
                (r, n) -> {
                    var row = new LinkedHashMap<String, Object>();
                    row.put("id", r.getString(1));
                    row.put("username", r.getString(2));
                    row.put("email", r.getString(3));
                    row.put("name", r.getString(4));
                    row.put(
                            "status",
                            r.getBoolean(6) ? "suspended" : r.getBoolean(5) ? "active" : "invited");
                    row.put("createdAt", r.getLong(7));
                    return row;
                });
    }

    @Transactional
    public Map<String, Object> create(String name, String email, String admin) {
        String displayName = name.trim(), address = email.trim().toLowerCase(Locale.ROOT);
        if (displayName.length() < 2 || displayName.length() > 80)
            throw invalid("Enter the verifier's full name (2-80 characters)");
        if (address.length() > 100 || !address.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))
            throw invalid("Enter a valid email address");
        if (accounts.login(address).isPresent()
                || db.queryForObject(
                                "SELECT COUNT(*) FROM provider_applications WHERE email=?",
                                Integer.class,
                                address)
                        > 0)
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "An account or application already uses this email");
        String id = UUID.randomUUID().toString(),
                username = applications.generatedUsername(displayName);
        // Inactive until the verifier opens the activation link and sets a password.
        accounts.create(id, username, address, null, "verifier", id, displayName, false);
        activation.issue(
                id,
                address,
                "Hello "
                        + displayName
                        + ",\nAn administrator has added you as a provider verifier on Arogya Mitra.\nUsername: "
                        + username);
        audit(admin, "verifier.created", id, address);
        return list().stream().filter(v -> id.equals(v.get("id"))).findFirst().orElseThrow();
    }

    @Transactional
    public Map<String, Object> setSuspended(String id, boolean suspended, String admin) {
        int changed =
                db.update(
                        "UPDATE accounts SET suspended=?,credential_version=credential_version+1 WHERE id=? AND role='verifier'",
                        suspended,
                        id);
        if (changed != 1)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Verifier not found");
        bridge.sync(id, true);
        audit(admin, suspended ? "verifier.suspended" : "verifier.reinstated", id, "");
        return list().stream().filter(v -> id.equals(v.get("id"))).findFirst().orElseThrow();
    }

    private void audit(String actor, String action, String resource, String detail) {
        db.update(
                "INSERT INTO audit_events(id,actor_id,action,resource_id,detail,created_at) VALUES(?,?,?,?,?,?)",
                UUID.randomUUID().toString(),
                actor,
                action,
                resource,
                detail,
                System.currentTimeMillis());
    }
}
