package in.arogyamitra.registration;

import in.arogyamitra.security.AccessService;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Admin access to the documents attached to provider applications. */
@RestController
@RequestMapping("/api/admin")
class ApplicationDocumentController {
    private final ApplicationDocuments documents;
    private final AccessService access;

    ApplicationDocumentController(ApplicationDocuments documents, AccessService access) {
        this.documents = documents;
        this.access = access;
    }

    @GetMapping("/applications/{id}/documents")
    public List<Map<String, Object>> list(@PathVariable String id) {
        access.require("admin");
        return documents.list(id);
    }

    @GetMapping("/documents/{id}")
    public ResponseEntity<byte[]> download(@PathVariable String id) {
        access.require("admin");
        return documents.download(id);
    }
}
