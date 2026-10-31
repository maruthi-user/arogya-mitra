package in.arogyamitra.shared;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class ApiInput {
    private ApiInput() {}
    public static ResponseStatusException invalid(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
    public static String text(Map<String,Object> body,String key) {
        if (!(body.get(key) instanceof String value) || value.isBlank() || value.length()>100) throw invalid("Invalid " + key);
        return value;
    }
    public static boolean bool(Map<String,Object> body,String key) {
        if (!(body.get(key) instanceof Boolean value)) throw invalid("Invalid " + key);
        return value;
    }
    public static Map<String,Object> actor(Map<String,Object> body) {
        if (!(body.get("actor") instanceof Map<?,?> value)) throw invalid("Actor required");
        var actor=new HashMap<String,Object>(); value.forEach((k,v)->actor.put(k.toString(),v));
        return Map.of("role",text(actor,"role"),"id",text(actor,"id"));
    }
}
