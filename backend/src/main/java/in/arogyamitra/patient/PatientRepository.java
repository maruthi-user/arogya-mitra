package in.arogyamitra.patient;

import in.arogyamitra.shared.entity.PatientRecord;
import jakarta.persistence.*;
import java.util.*;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional
public class PatientRepository {
    @PersistenceContext private EntityManager em;

    private Map<String, Object> view(PatientRecord p) {
        return Map.of(
                "id",
                p.id,
                "name",
                p.name,
                "village",
                p.village,
                "language",
                p.language,
                "phone",
                p.phone);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list() {
        return em
                .createQuery("select p from PatientRecord p order by p.id", PatientRecord.class)
                .getResultList()
                .stream()
                .map(this::view)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> find(String id) {
        return Optional.ofNullable(em.find(PatientRecord.class, id)).map(this::view);
    }

    public void create(String id, String name, String village, String language) {
        var p = new PatientRecord();
        p.id = id;
        p.name = name;
        p.village = village;
        p.language = language;
        em.persist(p);
        em.flush();
    }

    public void update(String id, String name, String village, String language, String phone) {
        var p = em.find(PatientRecord.class, id);
        p.name = name;
        p.village = village;
        p.language = language;
        p.phone = phone;
        em.flush();
    }
}
