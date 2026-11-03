package in.arogyamitra.registration;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import in.arogyamitra.security.AccessService;
import static in.arogyamitra.shared.ApiInput.*;

/** Private application evidence. Content never enters public catalog responses. */
@Service
public class ApplicationDocuments {
    private final JdbcTemplate db;
    public ApplicationDocuments(JdbcTemplate db){this.db=db;}
    public void save(String application,Object input){
        if(input==null)return; // Legacy applications remain valid.
        if(!(input instanceof List<?> files)||files.size()>3)throw invalid("Attach at most three documents");
        for(Object value:files){
            if(!(value instanceof Map<?,?> file))throw invalid("Invalid document");
            String name=Objects.toString(file.get("name"),""),type=Objects.toString(file.get("type"),""),content=Objects.toString(file.get("content"),"");
            if(name.isBlank()||name.length()>120||name.contains("/")||name.contains("\\")||name.chars().anyMatch(c->c<32)||content.length()>1400000)throw invalid("Invalid document name or size (maximum 1 MB)");
            byte[] bytes;try{bytes=Base64.getDecoder().decode(content);}catch(IllegalArgumentException e){throw invalid("Invalid document encoding");}
            boolean valid=bytes.length>=8&&bytes.length<=1048576&&switch(type){
                case "application/pdf"->bytes[0]=='%'&&bytes[1]=='P'&&bytes[2]=='D'&&bytes[3]=='F'&&bytes[4]=='-';
                case "image/png"->bytes[0]==(byte)137&&bytes[1]==80&&bytes[2]==78&&bytes[3]==71&&bytes[4]==13&&bytes[5]==10&&bytes[6]==26&&bytes[7]==10;
                case "image/jpeg"->bytes[0]==(byte)255&&bytes[1]==(byte)216&&bytes[2]==(byte)255;
                default->false;};
            if(!valid)throw invalid("Use PDF, PNG or JPEG documents up to 1 MB");
            db.update("INSERT INTO application_documents(id,application_id,filename,media_type,content_base64,created_at) VALUES(?,?,?,?,?,?)",UUID.randomUUID().toString(),application,name,type,content,System.currentTimeMillis());
        }
    }
    public List<Map<String,Object>> list(String application){return db.query("SELECT id,filename,media_type FROM application_documents WHERE application_id=?",(r,n)->Map.of("id",r.getString(1),"name",r.getString(2),"type",r.getString(3)),application);}
    public ResponseEntity<byte[]> download(String id){
        var rows=db.queryForList("SELECT filename,media_type,content_base64 FROM application_documents WHERE id=?",id);
        if(rows.isEmpty())return ResponseEntity.notFound().build();var row=rows.get(0);
        return ResponseEntity.ok().header("Cache-Control","no-store").header("X-Content-Type-Options","nosniff")
            .header("Content-Disposition","attachment; filename=\"document"+(row.get("media_type").equals("application/pdf")?".pdf":row.get("media_type").equals("image/png")?".png":".jpg")+"\"")
            .contentType(MediaType.parseMediaType((String)row.get("media_type"))).body(Base64.getDecoder().decode((String)row.get("content_base64")));
    }
}

@RestController
@RequestMapping("/api/admin")
class ApplicationDocumentController {
    private final ApplicationDocuments documents;private final AccessService access;
    ApplicationDocumentController(ApplicationDocuments documents,AccessService access){this.documents=documents;this.access=access;}
    @GetMapping("/applications/{id}/documents") public List<Map<String,Object>> list(@PathVariable String id){access.require("admin");return documents.list(id);}
    @GetMapping("/documents/{id}") public ResponseEntity<byte[]> download(@PathVariable String id){access.require("admin");return documents.download(id);}
}
