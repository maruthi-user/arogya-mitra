package in.arogyamitra.platform.repository.files;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import in.arogyamitra.platform.entity.files.FileAttachment;

public interface FileAttachmentRepository extends JpaRepository<FileAttachment, Long> {

    List<FileAttachment> findByOwnerTypeAndOwnerIdOrderByCreatedAtAsc(String ownerType, String ownerId);
}
