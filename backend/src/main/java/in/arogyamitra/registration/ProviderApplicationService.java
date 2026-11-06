package in.arogyamitra.registration;

import static in.arogyamitra.shared.ApiInput.*;

import in.arogyamitra.auth.*;
import in.arogyamitra.notification.NotificationService;
import in.arogyamitra.shared.persistence.CatalogRepository;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Provider onboarding, reviewed in two steps like the HRMS Team Lead -> HR flow:
 *
 * <pre>
 *   pending_verification --verifier approves--> pending_admin --admin approves--> approved --provider sets password--> activated
 *            \--verifier rejects--> verification_rejected        \--admin rejects--> rejected
 * </pre>
 *
 * The status column is authoritative; the JSON document carries the submitted details and review
 * history.
 */
@Service
public class ProviderApplicationService implements org.springframework.boot.ApplicationRunner {
    public static final String PENDING_VERIFICATION = "pending_verification",
            VERIFICATION_REJECTED = "verification_rejected",
            PENDING_ADMIN = "pending_admin",
            APPROVED = "approved",
            REJECTED = "rejected",
            ACTIVATED = "activated";

    /** Every check must be confirmed before a verifier can forward an application. */
    public static final List<String> VERIFICATION_CHECKS =
            List.of("identity", "qualification", "documents", "contact");

    private final in.arogyamitra.reference.ReferenceCatalog reference;
    private final JdbcTemplate db;
    private final CatalogRepository store;
    private final AccountRepository accounts;
    private final PlatformAccountBridge bridge;
    private final ActivationService activation;

    @org.springframework.beans.factory.annotation.Value("${app.frontend-url:http://localhost:3002}")
    private String frontend;

    private final ApplicationDocuments documents;
    private final NotificationService notifications;

    public ProviderApplicationService(
            JdbcTemplate db,
            CatalogRepository store,
            AccountRepository accounts,
            NotificationService notifications,
            ApplicationDocuments documents,
            in.arogyamitra.reference.ReferenceCatalog reference,
            PlatformAccountBridge bridge,
            ActivationService activation) {
        this.bridge = bridge;
        this.activation = activation;
        this.reference = reference;
        this.documents = documents;
        this.db = db;
        this.store = store;
        this.accounts = accounts;
        this.notifications = notifications;
    }

    @Override
    @Transactional
    public void run(org.springframework.boot.ApplicationArguments ignored) {
        for (String account :
                db.query(
                        "SELECT id FROM accounts WHERE registration_status='pending' AND role='provider'",
                        (r, n) -> r.getString(1))) {
            var rows = db.queryForList("SELECT * FROM accounts WHERE id=? FOR UPDATE", account);
            if (rows.isEmpty()) continue;
            var a = rows.get(0);
            if (db.queryForObject(
                            "SELECT COUNT(*) FROM provider_applications WHERE email=?",
                            Integer.class,
                            a.get("email"))
                    > 0) continue;
            var businesses =
                    db.query(
                            "SELECT document FROM provider_business_profiles WHERE provider_id=?",
                            (r, n) -> store.decode(r.getString(1)),
                            a.get("subject_id"));
            if (businesses.isEmpty()) continue;
            var business = businesses.get(0);
            String id = UUID.randomUUID().toString();
            var app = new LinkedHashMap<String, Object>();
            app.put("id", id);
            app.put("accountId", account);
            app.put("providerId", a.get("subject_id"));
            app.put("name", a.get("display_name"));
            app.put("username", a.get("username"));
            app.put("email", a.get("email"));
            app.put("phone", business.getOrDefault("phone", ""));
            app.put("status", PENDING_VERIFICATION);
            app.put("submittedAt", a.get("created_at"));
            app.put("approvalWorkflow", true);
            for (String key : List.of("termsAcceptedAt", "termsVersion"))
                if (business.containsKey(key)) app.put(key, business.get(key));
            db.update(
                    "INSERT INTO provider_applications(id,username,email,status,document,submitted_at,account_id) VALUES(?,?,?,?,?,?,?)",
                    id,
                    a.get("username"),
                    a.get("email"),
                    PENDING_VERIFICATION,
                    store.encode(app),
                    a.get("created_at"),
                    account);
        }
        // Applications created before V7 keep their account id only inside the document.
        for (var row :
                db.queryForList(
                        "SELECT id,document FROM provider_applications WHERE account_id IS NULL")) {
            Object account = store.decode((String) row.get("document")).get("accountId");
            if (account instanceof String value && !value.isBlank())
                db.update(
                        "UPDATE provider_applications SET account_id=? WHERE id=?",
                        value,
                        row.get("id"));
        }
        // Applications created before V8 have their listed fields only inside the document.
        for (var row :
                db.queryForList(
                        "SELECT id,status,document FROM provider_applications WHERE name IS NULL")) {
            var app = store.decode((String) row.get("document"));
            app.put("id", row.get("id"));
            app.put("status", row.get("status"));
            syncColumns(app);
        }
    }

    private String field(Map<String, Object> input, String key, int max) {
        String v = text(input, key).trim();
        if (v.length() > max) throw invalid("Invalid " + key);
        return v;
    }

    @Transactional
    public Map<String, Object> submit(Map<String, Object> input) {
        if (!input.containsKey("organization")) return createAccount(input);
        String name = field(input, "name", 80),
                email = field(input, "email", 100).toLowerCase(Locale.ROOT);
        String phone = field(input, "phone", 20).replaceAll("[\\s-]", ""),
                organization = field(input, "organization", 100),
                designation = field(input, "designation", 20),
                village = field(input, "village", 30);
        if (!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")
                || !phone.matches("(?:\\+91)?[6-9]\\d{9}")
                || !reference.contains("villages", village))
            throw invalid("Check your username, email, phone, designation and village");
        String businessType = input.getOrDefault("businessType", "practitioner").toString();
        if (!reference.contains("businessTypes", businessType))
            throw invalid("Invalid business type");
        if (Set.of("practitioner", "hospital", "clinic").contains(businessType)
                && !Set.of("mbbs", "rmp", "ayush").contains(designation))
            throw invalid(
                    "Choose the clinical qualification for a practitioner, hospital or clinic");
        String address = input.getOrDefault("address", "").toString().trim();
        if (address.length() > 300) throw invalid("Address is too long");
        if (input.containsKey("businessType")
                && (address.length() < 5
                        || !(input.get("documents") instanceof List<?> docs)
                        || docs.isEmpty()))
            throw invalid("Business address and at least one supporting document are required");
        String registration =
                input.getOrDefault("registrationId", "") instanceof String v ? v.trim() : "";
        if (registration.length() > 100) throw invalid("Registration ID is too long");
        var result = createAccount(input);
        String id = (String) result.get("id");
        var application =
                db.query(
                                "SELECT document FROM provider_applications WHERE id=?",
                                (r, n) -> store.decode(r.getString(1)),
                                id)
                        .get(0);
        application.put("organization", organization);
        application.put("designation", designation);
        application.put("village", village);
        application.put("businessType", businessType);
        application.put("address", address);
        application.put("registrationId", registration);
        application.put("businessReviewIncluded", true);
        db.update(
                "UPDATE provider_applications SET document=? WHERE id=?",
                store.encode(application),
                id);
        syncColumns(application);
        documents.save(id, input.get("documents"));
        String provider = (String) application.get("providerId");
        var profile = store.lockEntity(provider);
        profile.put("organization", organization);
        profile.put("businessType", businessType);
        profile.put("address", address);
        profile.put("village", village);
        profile.put(
                "type",
                Set.of("practitioner", "hospital", "clinic").contains(businessType)
                        ? designation
                        : businessType);
        store.save(provider, profile);
        var business =
                db.query(
                                "SELECT document FROM provider_business_profiles WHERE provider_id=?",
                                (r, n) -> store.decode(r.getString(1)),
                                provider)
                        .get(0);
        for (String key :
                List.of(
                        "organization",
                        "designation",
                        "village",
                        "businessType",
                        "address",
                        "registrationId")) business.put(key, application.get(key));
        db.update(
                "UPDATE provider_business_profiles SET document=? WHERE provider_id=?",
                store.encode(business),
                provider);
        documents.save("business:" + provider, input.get("documents"));
        return result;
    }

    private Map<String, Object> createAccount(Map<String, Object> input) {
        String name = field(input, "name", 80),
                email = field(input, "email", 100).toLowerCase(Locale.ROOT);
        String phone = field(input, "phone", 20).replaceAll("[\\s-]", "");
        if (name.length() < 2
                || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")
                || !phone.matches("(?:\\+91)?[6-9]\\d{9}")
                || !Boolean.TRUE.equals(input.get("termsAccepted")))
            throw invalid("Enter your name, email, mobile and accept the Terms and Privacy Policy");
        if (accounts.login(email).isPresent()
                || db.queryForObject(
                                "SELECT COUNT(*) FROM provider_applications WHERE email=?",
                                Integer.class,
                                email)
                        > 0)
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "An account or application already uses this email");
        String provider = "p-" + UUID.randomUUID(), account = UUID.randomUUID().toString();
        long now = System.currentTimeMillis();
        var profile = new LinkedHashMap<String, Object>();
        profile.put("id", provider);
        profile.put("name", name);
        profile.put("phone", phone);
        profile.put("organization", "");
        profile.put("businessType", "practitioner");
        profile.put("type", "unconfigured");
        profile.put("village", "");
        profile.put("slots", List.of());
        profile.put("fee", 0);
        profile.put("services", "");
        profile.put("open", false);
        profile.put("verificationStatus", "unverified");
        store.create(provider, "providers", profile);
        var business = new LinkedHashMap<String, Object>();
        business.put("providerId", provider);
        business.put("name", name);
        business.put("phone", phone);
        business.put("email", email);
        business.put("status", "draft");
        business.put("active", true);
        business.put("termsAcceptedAt", now);
        business.put("termsVersion", "2026-11-03");
        db.update(
                "INSERT INTO provider_business_profiles(provider_id,status,active,document,updated_at) VALUES(?,'draft',TRUE,?,?)",
                provider,
                store.encode(business),
                now);
        String username = generatedUsername(name);
        accounts.create(account, username, email, null, "provider", provider, name, false);
        db.update("UPDATE accounts SET registration_status='pending' WHERE id=?", account);
        String id = UUID.randomUUID().toString();
        var application = new LinkedHashMap<String, Object>();
        application.put("id", id);
        application.put("name", name);
        application.put("username", username);
        application.put("email", email);
        application.put("phone", phone);
        application.put("status", PENDING_VERIFICATION);
        application.put("submittedAt", now);
        application.put("accountId", account);
        application.put("providerId", provider);
        application.put("approvalWorkflow", true);
        application.put("termsAcceptedAt", now);
        application.put("termsVersion", "2026-11-03");
        db.update(
                "INSERT INTO provider_applications(id,username,email,status,document,submitted_at,account_id,name,phone,business_type) VALUES(?,?,?,?,?,?,?,?,?,?)",
                id,
                username,
                email,
                PENDING_VERIFICATION,
                store.encode(application),
                now,
                account,
                name,
                phone,
                "practitioner");
        recordEvent(id, account, null, PENDING_VERIFICATION, "");
        notifications.queue(
                email,
                "Arogya Mitra - registration received",
                "Hello "
                        + name
                        + ",\nYour provider registration has been received. A verifier will check your details first, then an administrator makes the final decision. You cannot sign in until it is approved.\nUsername: "
                        + username
                        + "\nReference: "
                        + id);
        return Map.of(
                "id",
                id,
                "username",
                username,
                "status",
                PENDING_VERIFICATION,
                "message",
                "Registration submitted for verification. We will email the decision.");
    }

    String generatedUsername(String name) {
        String base =
                java.text.Normalizer.normalize(name, java.text.Normalizer.Form.NFD)
                        .replaceAll("\\p{M}", "")
                        .toLowerCase(Locale.ROOT)
                        .replaceAll("[^a-z0-9]+", "-")
                        .replaceAll("^-|-$", "");
        if (base.length() < 3) base = "provider-" + Integer.toUnsignedString(name.hashCode(), 36);
        if (base.length() > 36) base = base.substring(0, 36);
        String candidate = base;
        while (accounts.login(candidate).isPresent()
                || db.queryForObject(
                                "SELECT COUNT(*) FROM provider_applications WHERE username=?",
                                Integer.class,
                                candidate)
                        > 0
                || db.queryForObject(
                                "SELECT COUNT(*) FROM APP_USERS WHERE LOWER(username)=?",
                                Integer.class,
                                candidate)
                        > 0) candidate = base + "-" + UUID.randomUUID().toString().substring(0, 8);
        return candidate;
    }

    // ================= QUEUES =================

    /** All applications, newest first. {@code statuses} empty means every status. */
    public List<Map<String, Object>> list(Collection<String> statuses) {
        return db
                .query(
                        "SELECT status,document FROM provider_applications ORDER BY submitted_at DESC",
                        (r, n) -> {
                            var app = store.decode(r.getString(2));
                            app.put("status", r.getString(1));
                            return app;
                        })
                .stream()
                .filter(app -> statuses.isEmpty() || statuses.contains(app.get("status")))
                .toList();
    }

    public List<Map<String, Object>> list() {
        return list(List.of());
    }

    private Map<String, Object> lockApplication(String id) {
        var rows =
                db.query(
                        "SELECT status,document FROM provider_applications WHERE id=? FOR UPDATE",
                        (r, n) -> {
                            var app = store.decode(r.getString(2));
                            app.put("status", r.getString(1));
                            return app;
                        },
                        id);
        if (rows.isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found");
        return rows.get(0);
    }

    private void saveApplication(Map<String, Object> app) {
        db.update(
                "UPDATE provider_applications SET status=?,document=? WHERE id=?",
                app.get("status"),
                store.encode(app),
                app.get("id"));
        syncColumns(app);
    }

    /** Copies the listed fields out of the document into their own columns. */
    private void syncColumns(Map<String, Object> app) {
        db.update(
                "UPDATE provider_applications SET name=?,phone=?,organization=?,business_type=?,verified_by=?,verified_at=?,reviewed_by=?,reviewed_at=? WHERE id=?",
                limit(app.get("name"), 80),
                limit(app.get("phone"), 20),
                limit(app.get("organization"), 100),
                limit(app.getOrDefault("businessType", "practitioner"), 30),
                app.get("verifiedBy"),
                number(app.get("verifiedAt")),
                app.get("reviewedBy"),
                number(app.get("reviewedAt")),
                app.get("id"));
    }

    private static String limit(Object value, int max) {
        if (value == null) return null;
        String text = value.toString();
        return text.length() > max ? text.substring(0, max) : text;
    }

    private static Long number(Object value) {
        return value instanceof Number n ? n.longValue() : null;
    }

    /** One row per status change, so the review history is never overwritten. */
    void recordEvent(String application, String actor, String from, String to, String note) {
        db.update(
                "INSERT INTO application_events(id,application_id,actor_id,from_status,to_status,note,created_at) VALUES(?,?,?,?,?,?,?)",
                UUID.randomUUID().toString(),
                application,
                actor,
                from,
                to,
                note == null || note.isBlank() ? null : limit(note, 1000),
                System.currentTimeMillis());
    }

    /** Status history, oldest first, with the actor's display name where known. */
    public List<Map<String, Object>> history(String id) {
        if (db.queryForObject(
                        "SELECT COUNT(*) FROM provider_applications WHERE id=?", Integer.class, id)
                == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found");
        return db.query(
                "SELECT e.from_status,e.to_status,e.note,e.created_at,e.actor_id,a.display_name,a.role FROM application_events e LEFT JOIN accounts a ON a.id=e.actor_id WHERE e.application_id=? ORDER BY e.created_at,e.id",
                (r, n) -> {
                    var event = new LinkedHashMap<String, Object>();
                    event.put("from", r.getString(1));
                    event.put("to", r.getString(2));
                    event.put("note", r.getString(3));
                    event.put("at", r.getLong(4));
                    event.put("actorName", r.getString(6) == null ? "" : r.getString(6));
                    event.put("actorRole", r.getString(7) == null ? "" : r.getString(7));
                    return event;
                },
                id);
    }

    private void audit(String actor, String action, String application, String detail) {
        db.update(
                "INSERT INTO audit_events(id,actor_id,action,resource_id,detail,created_at) VALUES(?,?,?,?,?,?)",
                UUID.randomUUID().toString(),
                actor,
                action,
                application,
                detail,
                System.currentTimeMillis());
    }

    private static String reason(String decision, String reason) {
        if (!Set.of(APPROVED, REJECTED).contains(decision))
            throw invalid("Decision must be approved or rejected");
        String value = reason == null ? "" : reason.trim();
        if (value.length() > 1000) throw invalid("Reason must be at most 1000 characters");
        if (decision.equals(REJECTED) && value.length() < 5)
            throw invalid("Rejection requires a reason (5-1000 characters)");
        return value;
    }

    // ================= STEP 1: VERIFIER (like the HRMS Team Lead action) =================

    @Transactional
    public Map<String, Object> verify(
            String id, String decision, String remarks, Map<String, ?> checks, String verifier) {
        String reason = reason(decision, remarks);
        var app = lockApplication(id);
        if (!PENDING_VERIFICATION.equals(app.get("status")))
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "This application is not waiting for verification");
        app.put("verifiedBy", verifier);
        app.put("verifiedAt", System.currentTimeMillis());
        app.put("verificationRemarks", reason);
        if (decision.equals(APPROVED)) {
            var confirmed = new LinkedHashMap<String, Object>();
            for (String check : VERIFICATION_CHECKS) {
                if (checks == null || !Boolean.TRUE.equals(checks.get(check)))
                    throw invalid(
                            "Confirm every verification check before forwarding to the administrator");
                confirmed.put(check, true);
            }
            app.put("verificationChecks", confirmed);
            app.put("status", PENDING_ADMIN);
            saveApplication(app);
            recordEvent(id, verifier, PENDING_VERIFICATION, PENDING_ADMIN, reason);
            notifyAdmins(app);
        } else {
            app.put("status", VERIFICATION_REJECTED);
            app.put("reviewReason", reason);
            saveApplication(app);
            recordEvent(id, verifier, PENDING_VERIFICATION, VERIFICATION_REJECTED, reason);
            closeAccount(app);
            notifications.queue(
                    (String) app.get("email"),
                    "Arogya Mitra - provider registration rejected",
                    "Hello "
                            + app.get("name")
                            + ",\nYour provider registration could not be verified.\nReason: "
                            + reason
                            + "\nReference: "
                            + id);
        }
        audit(verifier, "application.verification_" + decision, id, reason);
        return app;
    }

    private void notifyAdmins(Map<String, Object> app) {
        for (String email :
                db.query(
                        "SELECT email FROM accounts WHERE role='admin' AND active=TRUE AND suspended=FALSE",
                        (r, n) -> r.getString(1)))
            notifications.queue(
                    email,
                    "Arogya Mitra - provider awaiting approval",
                    "A verifier has checked the registration of "
                            + app.get("name")
                            + " ("
                            + app.get("email")
                            + ") and forwarded it for your decision.\nReview it here: "
                            + frontend
                            + "/app/adminApplications\nReference: "
                            + app.get("id"));
    }

    // ================= STEP 2: ADMIN (like the HRMS HR / approver action) =================

    @Transactional
    public Map<String, Object> review(String id, String decision, String remarks, String admin) {
        String reason = reason(decision, remarks);
        var app = lockApplication(id);
        if (!PENDING_ADMIN.equals(app.get("status")))
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    PENDING_VERIFICATION.equals(app.get("status"))
                            ? "This application must be verified before the final decision"
                            : "This application has already been reviewed");
        app.put("status", decision);
        app.put("reviewReason", reason);
        app.put("reviewedBy", admin);
        app.put("reviewedAt", System.currentTimeMillis());
        recordEvent(id, admin, PENDING_ADMIN, decision, reason);
        if (decision.equals(APPROVED)) approve(app, reason);
        else {
            saveApplication(app);
            closeAccount(app);
            notifications.queue(
                    (String) app.get("email"),
                    "Arogya Mitra - provider registration rejected",
                    "Hello "
                            + app.get("name")
                            + ",\nYour provider registration was rejected.\nReason: "
                            + reason
                            + "\nReference: "
                            + id);
        }
        audit(admin, "application." + decision, id, reason);
        return app;
    }

    private void approve(Map<String, Object> app, String reason) {
        String account = (String) app.get("accountId");
        if (Boolean.TRUE.equals(app.get("approvalWorkflow"))) {
            // The account stays inactive until the provider opens the activation link and sets a
            // password.
            int changed =
                    db.update(
                            "UPDATE accounts SET active=FALSE,registration_status='approved',must_change_password=FALSE,credential_version=credential_version+1 WHERE id=? AND suspended=FALSE",
                            account);
            if (changed != 1)
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "Account is suspended or no longer available");
            if (Boolean.TRUE.equals(app.get("businessReviewIncluded"))) {
                String provider = (String) app.get("providerId");
                var business =
                        db.query(
                                        "SELECT document FROM provider_business_profiles WHERE provider_id=?",
                                        (r, n) -> store.decode(r.getString(1)),
                                        provider)
                                .get(0);
                business.put("status", "approved");
                business.put("reviewReason", reason);
                db.update(
                        "UPDATE provider_business_profiles SET status='approved',document=? WHERE provider_id=?",
                        store.encode(business),
                        provider);
            }
            bridge.sync(account, true);
        } else {
            // Applications from before the approval workflow have no account yet.
            String provider = "p-" + UUID.randomUUID();
            account = UUID.randomUUID().toString();
            var profile = new LinkedHashMap<String, Object>();
            profile.put("id", provider);
            profile.put("name", app.get("name"));
            profile.put("organization", app.get("organization"));
            profile.put("businessType", app.getOrDefault("businessType", "practitioner"));
            profile.put("address", app.getOrDefault("address", ""));
            profile.put(
                    "type",
                    Set.of("practitioner", "hospital", "clinic")
                                    .contains(app.getOrDefault("businessType", "practitioner"))
                            ? app.get("designation")
                            : app.get("businessType"));
            profile.put("village", app.get("village"));
            profile.put("phone", app.get("phone"));
            profile.put("slots", List.of());
            profile.put("fee", 0);
            profile.put("services", "");
            profile.put("open", false);
            profile.put("verificationStatus", "unverified");
            store.create(provider, "providers", profile);
            accounts.create(
                    account,
                    (String) app.get("username"),
                    (String) app.get("email"),
                    null,
                    "provider",
                    provider,
                    (String) app.get("name"),
                    false);
            app.put("providerId", provider);
            app.put("accountId", account);
            db.update(
                    "UPDATE provider_applications SET account_id=? WHERE id=?",
                    account,
                    app.get("id"));
        }
        saveApplication(app);
        sendActivation(app, reason);
    }

    private void sendActivation(Map<String, Object> app, String note) {
        activation.issue(
                (String) app.get("accountId"),
                (String) app.get("email"),
                "Hello "
                        + app.get("name")
                        + ",\nYour provider registration has been approved."
                        + (note == null || note.isBlank() ? "" : "\n" + note)
                        + "\nUsername: "
                        + app.get("username"));
    }

    private void closeAccount(Map<String, Object> app) {
        String account = (String) app.get("accountId");
        if (account == null) return;
        db.update(
                "UPDATE accounts SET active=FALSE,registration_status='rejected',must_change_password=FALSE,credential_version=credential_version+1 WHERE id=?",
                account);
        bridge.sync(account, true);
        db.update("UPDATE activation_tokens SET used=TRUE WHERE account_id=?", account);
    }

    /**
     * Approved providers who lost or let their link expire get a fresh one; the old link stops
     * working.
     */
    @Transactional
    public Map<String, Object> resendActivation(String id, String admin) {
        var app = lockApplication(id);
        if (!APPROVED.equals(app.get("status")))
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only approved applications that are not yet activated can be resent");
        sendActivation(app, "");
        recordEvent(id, admin, APPROVED, APPROVED, "Activation link resent");
        audit(admin, "application.activation_resent", id, "");
        return app;
    }
}
