package in.arogyamitra.shared.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/** The V9 columns follow the JSON documents on create, save and startup backfill. */
@SpringBootTest(
        properties = {
            "spring.profiles.active=test",
            "spring.datasource.url=jdbc:h2:mem:columns;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1",
            "spring.datasource.username=sa",
            "spring.datasource.password=",
            "security.jwt.secret-key=dGVzdC1vbmx5LWp3dC1zZWNyZXQtZm9yLWludGVncmF0aW9uLXRlc3RzLTEyMzQ1Njc4OTA=",
            "app.notifications.scheduling=false",
            "app.files.local-dir=target/test-uploads"
        })
class DocumentColumnsTest {
    @Autowired CatalogRepository store;
    @Autowired DocumentColumns columns;
    @Autowired JdbcTemplate db;

    @Test
    void entityColumnsFollowCreateAndSave() {
        String id = "p-" + UUID.randomUUID();
        var provider = new LinkedHashMap<String, Object>();
        provider.put("id", id);
        provider.put("name", "Asha Clinic");
        provider.put("village", "town");
        provider.put("businessType", "clinic");
        provider.put("type", "mbbs");
        provider.put("open", false);
        store.create(id, "providers", provider);
        assertThat(row(id))
                .containsEntry("name", "Asha Clinic")
                .containsEntry("village", "town")
                .containsEntry("business_type", "clinic")
                .containsEntry("provider_type", "mbbs")
                .containsEntry("is_open", false);

        provider.put("organization", "Asha Health");
        provider.put("open", true);
        store.save(id, provider);
        assertThat(row(id))
                .containsEntry("organization", "Asha Health")
                .containsEntry("is_open", true);
    }

    @Test
    void serviceColumnsAreSyncedAndBackfilled() throws Exception {
        String id = UUID.randomUUID().toString();
        Map<String, Object> service =
                new LinkedHashMap<>(
                        Map.of(
                                "id",
                                id,
                                "providerId",
                                "p-x",
                                "kind",
                                "op",
                                "title",
                                "General OP",
                                "businessType",
                                "clinic",
                                "organization",
                                "Asha Health",
                                "totalFee",
                                150,
                                "available",
                                true,
                                "updatedAt",
                                1234L));
        // Written the pre-V9 way: document only.
        db.update(
                "INSERT INTO care_services(id,provider_id,approval,active,document) VALUES(?,?,?,?,?)",
                id,
                "p-x",
                "approved",
                true,
                store.encode(service));
        assertThat(
                        db.queryForObject(
                                "SELECT title FROM care_services WHERE id=?", String.class, id))
                .isNull();

        columns.run(null);
        var row =
                db.queryForMap(
                        "SELECT kind,title,business_type,organization,total_fee,available,updated_at FROM care_services WHERE id=?",
                        id);
        assertThat(row)
                .containsEntry("kind", "op")
                .containsEntry("title", "General OP")
                .containsEntry("total_fee", 150)
                .containsEntry("available", true)
                .containsEntry("updated_at", 1234L);

        service.put("title", "Evening OP");
        columns.syncService(service);
        assertThat(
                        db.queryForObject(
                                "SELECT title FROM care_services WHERE id=?", String.class, id))
                .isEqualTo("Evening OP");
    }

    private Map<String, Object> row(String id) {
        return db.queryForMap(
                "SELECT name,village,organization,business_type,provider_type,is_open FROM entities WHERE id=?",
                id);
    }
}
