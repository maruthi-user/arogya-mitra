package in.arogyamitra.platform.repository.files;

import in.arogyamitra.platform.entity.files.FileAttachment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FileAttachmentRepository extends JpaRepository<FileAttachment, Long> {

    List<FileAttachment> findByOwnerTypeAndOwnerIdOrderByCreatedAtAsc(
            String ownerType, String ownerId);
}
