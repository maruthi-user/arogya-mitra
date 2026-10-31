package in.arogyamitra.patient;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PatientRepository {
    private final JdbcTemplate db;
    public PatientRepository(JdbcTemplate db){this.db=db;}
    public List<Map<String,Object>> list(){return db.query("SELECT id,name,village,language,phone FROM patients ORDER BY id",(r,n)->Map.of("id",r.getString(1),"name",r.getString(2),"village",r.getString(3),"language",r.getString(4),"phone",r.getString(5)));}
    public Optional<Map<String,Object>> find(String id){return db.query("SELECT id,name,village,language,phone FROM patients WHERE id=?",(r,n)->Map.<String,Object>of("id",r.getString(1),"name",r.getString(2),"village",r.getString(3),"language",r.getString(4),"phone",r.getString(5)),id).stream().findFirst();}
    public void create(String id,String name,String village,String language){db.update("INSERT INTO patients(id,name,village,language) VALUES(?,?,?,?)",id,name,village,language);}
    public void update(String id,String name,String village,String language,String phone){db.update("UPDATE patients SET name=?,village=?,language=?,phone=? WHERE id=?",name,village,language,phone,id);}
}
