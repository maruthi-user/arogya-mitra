package in.arogyamitra.shared.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "entities")
public class CatalogRecord {
    @Id
    @Column(length = 80)
    public String id;

    @Column(nullable = false, length = 20)
    public String kind;

    @Column(nullable = false, columnDefinition = "TEXT")
    public String document;

    @Column(name = "sample_data", nullable = false)
    public boolean sampleData;

    // Queryable copies of document fields (V9); set by apply() whenever the document is written.
    @Column(length = 120)
    public String name;

    @Column(length = 40)
    public String village;

    @Column(length = 100)
    public String organization;

    @Column(name = "business_type", length = 30)
    public String businessType;

    @Column(name = "provider_type", length = 30)
    public String providerType;

    @Column(name = "is_open")
    public Boolean open;

    public CatalogRecord() {}

    /** Stores the document and refreshes the column copies from it. */
    public void apply(String encoded, java.util.Map<String, Object> item) {
        document = encoded;
        name = limit(item.get("name"), 120);
        village = limit(item.get("village"), 40);
        organization = limit(item.get("organization"), 100);
        businessType = limit(item.get("businessType"), 30);
        providerType = limit(item.get("type"), 30);
        open = item.get("open") instanceof Boolean b ? b : null;
    }

    private static String limit(Object value, int max) {
        if (value == null) return null;
        String text = value.toString();
        return text.length() > max ? text.substring(0, max) : text;
    }
}
