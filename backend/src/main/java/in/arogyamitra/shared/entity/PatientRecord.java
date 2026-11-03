package in.arogyamitra.shared.entity;
import jakarta.persistence.*;
@Entity @Table(name="patients")
public class PatientRecord {
 @Id @Column(length=80) public String id;
 @Column(nullable=false,length=40) public String name;
 @Column(nullable=false,length=40) public String village;
 @Column(nullable=false,length=10) public String language;
 @Column(nullable=false,length=20) public String phone="";
 public PatientRecord(){}
}
