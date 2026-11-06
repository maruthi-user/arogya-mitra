package in.arogyamitra.shared.persistence;

import java.util.Map;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Copies the commonly queried fields of JSON documents into their own columns (V9): catalog
 * entities through {@link CatalogRepository}, care services through {@link #syncService}. On
 * startup it fills the columns for rows saved before they existed.
 */
@Component
public class DocumentColumns implements ApplicationRunner {
    private final JdbcTemplate db;
    private final CatalogRepository store;

    public DocumentColumns(JdbcTemplate db, CatalogRepository store) {
        this.db = db;
        this.store = store;
    }

    static String text(Object value, int max) {
        if (value == null) return null;
        String text = value.toString();
        return text.length() > max ? text.substring(0, max) : text;
    }

    static Boolean flag(Object value) {
        return value instanceof Boolean b ? b : null;
    }

    static Integer number(Object value) {
        return value instanceof Number n ? n.intValue() : null;
    }

    /** Call after every write of a care_services document. */
    public void syncService(Map<String, Object> service) {
        db.update(
                "UPDATE care_services SET kind=?,title=?,business_type=?,organization=?,total_fee=?,available=?,updated_at=? WHERE id=?",
                text(service.get("kind"), 30),
                text(service.get("title"), 120),
                text(service.get("businessType"), 30),
                text(service.get("organization"), 100),
                number(service.get("totalFee")),
                flag(service.get("available")),
                service.get("updatedAt") instanceof Number n ? n.longValue() : null,
                service.get("id"));
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (var row : db.queryForList("SELECT id,document FROM entities WHERE name IS NULL")) {
            var doc = store.decode((String) row.get("document"));
            db.update(
                    "UPDATE entities SET name=?,village=?,organization=?,business_type=?,provider_type=?,is_open=? WHERE id=?",
                    text(doc.get("name"), 120),
                    text(doc.get("village"), 40),
                    text(doc.get("organization"), 100),
                    text(doc.get("businessType"), 30),
                    text(doc.get("type"), 30),
                    flag(doc.get("open")),
                    row.get("id"));
        }
        for (var row : db.queryForList("SELECT document FROM care_services WHERE title IS NULL")) {
            syncService(store.decode((String) row.get("document")));
        }
    }
}
