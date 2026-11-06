package in.arogyamitra.platform.controller.files;

import in.arogyamitra.platform.config.ConditionalOnAppModule;
import in.arogyamitra.platform.entity.files.FileAttachment;
import in.arogyamitra.platform.service.files.AttachmentService;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/files")
@ConditionalOnAppModule("files")
public class FileController {

    public record AttachmentDto(
            Long id,
            String ownerType,
            String ownerId,
            String fileName,
            String contentType,
            long sizeBytes,
            Long uploadedBy,
            LocalDateTime createdAt) {
        static AttachmentDto from(FileAttachment a) {
            return new AttachmentDto(
                    a.getId(),
                    a.getOwnerType(),
                    a.getOwnerId(),
                    a.getFileName(),
                    a.getContentType(),
                    a.getSizeBytes(),
                    a.getUploadedBy(),
                    a.getCreatedAt());
        }
    }

    private final AttachmentService attachments;

    public FileController(AttachmentService attachments) {
        this.attachments = attachments;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perm.has('files.use')")
    public AttachmentDto upload(
            @RequestParam String ownerType,
            @RequestParam String ownerId,
            @RequestParam("file") MultipartFile file) {
        return AttachmentDto.from(attachments.upload(ownerType, ownerId, file));
    }

    @GetMapping
    @PreAuthorize("@perm.has('files.use')")
    public List<AttachmentDto> list(@RequestParam String ownerType, @RequestParam String ownerId) {
        return attachments.list(ownerType, ownerId).stream().map(AttachmentDto::from).toList();
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("@perm.has('files.use')")
    public ResponseEntity<InputStreamResource> download(@PathVariable Long id) {
        AttachmentService.Download d = attachments.download(id);
        FileAttachment a = d.attachment();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(a.getContentType()))
                .contentLength(a.getSizeBytes())
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(a.getFileName())
                                .build()
                                .toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(new InputStreamResource(d.content()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.has('files.use')")
    public void delete(@PathVariable Long id) {
        attachments.delete(id);
    }
}
