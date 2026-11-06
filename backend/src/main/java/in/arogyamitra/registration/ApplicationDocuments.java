package in.arogyamitra.registration;

import static in.arogyamitra.shared.ApiInput.*;

import in.arogyamitra.platform.service.files.FileStorage;
import java.util.*;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Private application evidence. Content never enters public catalog responses. Bytes go to the
 * configured FileStorage (local disk, S3 or Spaces) under {@code application-documents/<id>}; when
 * the files module is disabled, and for rows saved before V8, they stay base64 in the database.
 */
@Service
public class ApplicationDocuments {
    private static final String PREFIX = "application-documents/";
    private final JdbcTemplate db;
    private final org.springframework.beans.factory.ObjectProvider<FileStorage> storage;

    public ApplicationDocuments(
            JdbcTemplate db,
            org.springframework.beans.factory.ObjectProvider<FileStorage> storage) {
        this.db = db;
        this.storage = storage;
    }

    private void insert(
            String application, String name, String type, String content, byte[] bytes) {
        String id = UUID.randomUUID().toString();
        FileStorage files = storage.getIfAvailable();
        if (files == null) {
            db.update(
                    "INSERT INTO application_documents(id,application_id,filename,media_type,content_base64,created_at) VALUES(?,?,?,?,?,?)",
                    id,
                    application,
                    name,
                    type,
                    content,
                    System.currentTimeMillis());
            return;
        }
        try {
            files.store(PREFIX + id, new java.io.ByteArrayInputStream(bytes), bytes.length, type);
        } catch (java.io.IOException e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Could not store the document. Please try again.");
        }
        db.update(
                "INSERT INTO application_documents(id,application_id,filename,media_type,storage_key,created_at) VALUES(?,?,?,?,?,?)",
                id,
                application,
                name,
                type,
                PREFIX + id,
                System.currentTimeMillis());
    }

    public void save(String application, Object input) {
        if (input == null) return; // Legacy applications remain valid.
        if (!(input instanceof List<?> files) || files.size() > 3)
            throw invalid("Attach at most three documents");
        for (Object value : files) {
            if (!(value instanceof Map<?, ?> file)) throw invalid("Invalid document");
            String name = Objects.toString(file.get("name"), ""),
                    type = Objects.toString(file.get("type"), ""),
                    content = Objects.toString(file.get("content"), "");
            if (name.isBlank()
                    || name.length() > 120
                    || name.contains("/")
                    || name.contains("\\")
                    || name.chars().anyMatch(c -> c < 32)
                    || content.length() > 1400000)
                throw invalid("Invalid document name or size (maximum 1 MB)");
            byte[] bytes;
            try {
                bytes = Base64.getDecoder().decode(content);
            } catch (IllegalArgumentException e) {
                throw invalid("Invalid document encoding");
            }
            boolean valid =
                    bytes.length >= 8
                            && bytes.length <= 1048576
                            && switch (type) {
                                case "application/pdf" ->
                                        bytes[0] == '%'
                                                && bytes[1] == 'P'
                                                && bytes[2] == 'D'
                                                && bytes[3] == 'F'
                                                && bytes[4] == '-';
                                case "image/png" ->
                                        bytes[0] == (byte) 137
                                                && bytes[1] == 80
                                                && bytes[2] == 78
                                                && bytes[3] == 71
                                                && bytes[4] == 13
                                                && bytes[5] == 10
                                                && bytes[6] == 26
                                                && bytes[7] == 10;
                                case "image/jpeg" ->
                                        bytes[0] == (byte) 255
                                                && bytes[1] == (byte) 216
                                                && bytes[2] == (byte) 255;
                                default -> false;
                            };
            if (!valid) throw invalid("Use PDF, PNG or JPEG documents up to 1 MB");
            insert(application, name, type, content, bytes);
        }
    }

    public List<Map<String, Object>> list(String application) {
        return db.query(
                "SELECT id,filename,media_type FROM application_documents WHERE application_id=?",
                (r, n) ->
                        Map.of(
                                "id",
                                r.getString(1),
                                "name",
                                r.getString(2),
                                "type",
                                r.getString(3)),
                application);
    }

    /**
     * Documents attached to a registration only; business-profile evidence stays admin/provider
     * only.
     */
    public ResponseEntity<byte[]> downloadApplicationDocument(String id) {
        var owner =
                db.query(
                        "SELECT application_id FROM application_documents WHERE id=?",
                        (r, n) -> r.getString(1),
                        id);
        if (owner.isEmpty() || owner.get(0).startsWith("business:"))
            return ResponseEntity.notFound().build();
        return download(id);
    }

    public ResponseEntity<byte[]> download(String id) {
        var rows =
                db.queryForList(
                        "SELECT filename,media_type,content_base64,storage_key FROM application_documents WHERE id=?",
                        id);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        var row = rows.get(0);
        byte[] body;
        if (row.get("storage_key") instanceof String key && !key.isBlank()) {
            FileStorage files = storage.getIfAvailable();
            if (files == null) return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
            try (var in = files.open(key)) {
                body = in.readAllBytes();
            } catch (java.io.IOException e) {
                return ResponseEntity.notFound().build();
            }
        } else body = Base64.getDecoder().decode((String) row.get("content_base64"));
        return ResponseEntity.ok()
                .header("Cache-Control", "no-store")
                .header("X-Content-Type-Options", "nosniff")
                .header(
                        "Content-Disposition",
                        "attachment; filename=\"document"
                                + (row.get("media_type").equals("application/pdf")
                                        ? ".pdf"
                                        : row.get("media_type").equals("image/png")
                                                ? ".png"
                                                : ".jpg")
                                + "\"")
                .contentType(MediaType.parseMediaType((String) row.get("media_type")))
                .body(body);
    }
}
