package in.arogyamitra.security;

import java.io.Serializable;

public record Identity(String accountId,String role,String subjectId,String displayName,int credentialVersion) implements Serializable {
    public Identity(String accountId,String role,String subjectId,String displayName){this(accountId,role,subjectId,displayName,0);}
}
