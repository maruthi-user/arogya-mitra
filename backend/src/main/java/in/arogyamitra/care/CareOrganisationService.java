package in.arogyamitra.care;

import static in.arogyamitra.shared.ApiInput.*;

import in.arogyamitra.auth.*;
import in.arogyamitra.security.*;
import in.arogyamitra.shared.persistence.CatalogRepository;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Admin view of provider organisations (suspend/reactivate) and provider staff invitations. */
@Service
public class CareOrganisationService {
    private final in.arogyamitra.auth.PlatformAccountBridge bridge;
    private final JdbcTemplate db;
    private final CatalogRepository store;
    private final AccessService access;
    private final AccountRepository accounts;
    private final ActivationService activation;
    private final CareSupport support;

    public CareOrganisationService(
            JdbcTemplate db,
            CatalogRepository store,
            AccessService access,
            AccountRepository accounts,
            ActivationService activation,
            in.arogyamitra.auth.PlatformAccountBridge bridge,
            CareSupport support) {
        this.bridge = bridge;
        this.db = db;
        this.store = store;
        this.access = access;
        this.accounts = accounts;
        this.activation = activation;
        this.support = support;
    }

    public List<Map<String, Object>> organisations() {
        access.require("admin");
        return db.query(
                "SELECT a.id,a.username,a.email,a.active,a.suspended,a.subject_id,a.display_name FROM accounts a WHERE a.role='provider' ORDER BY a.created_at",
                (r, n) ->
                        Map.of(
                                "id",
                                r.getString(1),
                                "username",
                                r.getString(2),
                                "email",
                                r.getString(3),
                                "active",
                                r.getBoolean(4),
                                "suspended",
                                r.getBoolean(5),
                                "providerId",
                                r.getString(6),
                                "name",
                                r.getString(7)));
    }

    @Transactional
    public void suspend(String provider, Map<String, Object> body) {
        var u = access.require("admin");
        store.lockEntity(provider);
        boolean suspended = bool(body, "suspended");
        String reason = support.string(body, "reason", 500, true);
        if (reason.length() < 5) throw invalid("Give a reason");
        int n =
                db.update(
                        "UPDATE accounts SET suspended=?,credential_version=credential_version+1 WHERE subject_id=? AND role='provider'",
                        suspended,
                        provider);
        if (n == 0) throw invalid("Organisation not found");
        db.update(
                "UPDATE activation_tokens SET used=TRUE WHERE account_id IN (SELECT id FROM accounts WHERE subject_id=?)",
                provider);
        bridge.syncOrganisation(provider);
        support.audit(
                u,
                suspended ? "organisation.suspended" : "organisation.reactivated",
                provider,
                reason);
    }

    public List<Map<String, Object>> staffList() {
        var u = access.current();
        if (!Set.of("admin", "provider").contains(u.role())) throw access.forbidden();
        return db.query(
                "SELECT id,username,display_name,email,active,suspended,subject_id FROM accounts WHERE role='provider'"
                        + (u.role().equals("provider") ? " AND subject_id=?" : "")
                        + " ORDER BY created_at",
                (r, n) ->
                        Map.<String, Object>of(
                                "id",
                                r.getString(1),
                                "username",
                                r.getString(2),
                                "name",
                                r.getString(3),
                                "email",
                                r.getString(4),
                                "active",
                                r.getBoolean(5),
                                "suspended",
                                r.getBoolean(6),
                                "providerId",
                                r.getString(7)),
                u.role().equals("provider") ? new Object[] {u.subjectId()} : new Object[] {});
    }

    @Transactional
    public void staff(Map<String, Object> body) {
        var u = access.current();
        if (!Set.of("admin", "provider").contains(u.role())) throw access.forbidden();
        String provider = u.role().equals("provider") ? u.subjectId() : text(body, "providerId");
        if (body.containsKey("providerId") && !provider.equals(body.get("providerId")))
            throw access.forbidden();
        store.lockEntity(provider);
        if (db.queryForObject(
                        "SELECT COUNT(*) FROM accounts WHERE subject_id=? AND active=TRUE AND suspended=FALSE AND registration_status='approved' AND must_change_password=FALSE",
                        Integer.class,
                        provider)
                == 0) throw support.conflict("Organisation account must be approved and active");
        String username = text(body, "username").toLowerCase(Locale.ROOT),
                email = text(body, "email").toLowerCase(Locale.ROOT),
                name = text(body, "name");
        if (!username.matches("[a-z0-9_.-]{3,50}")
                || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))
            throw invalid("Invalid staff username or email");
        String id = UUID.randomUUID().toString();
        accounts.create(id, username, email, null, "provider", provider, name, false);
        activation.issue(
                id,
                email,
                "You have been invited to the organisation. Your access is restricted to its records.");
        support.audit(u, "staff.invited", provider, username);
    }
}
