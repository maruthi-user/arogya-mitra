package in.arogyamitra.shared.entity;
import jakarta.persistence.*;
@Entity @Table(name="entities")
public class CatalogRecord {
 @Id @Column(length=80) public String id;
 @Column(nullable=false,length=20) public String kind;
 @Column(nullable=false,columnDefinition="TEXT") public String document;
 @Column(name="sample_data",nullable=false) public boolean sampleData;
 public CatalogRecord(){}
}
