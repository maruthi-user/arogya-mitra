package in.arogyamitra.shared;

import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;

@org.springframework.core.annotation.Order(-1)
@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    ResponseEntity<Map<String,String>> authentication(){return ResponseEntity.status(401).body(Map.of("message","Unable to sign in. Check your credentials and account activation."));}
    @ExceptionHandler(in.arogyamitra.platform.exception.TooManyRequestsException.class)
    ResponseEntity<Map<String,String>> throttled(in.arogyamitra.platform.exception.TooManyRequestsException e){return ResponseEntity.status(429).header("Retry-After",String.valueOf(e.getRetryAfterSeconds())).body(Map.of("message",e.getMessage()));}

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String,String>> conflict(){return ResponseEntity.status(409).body(Map.of("message","These details already exist or conflict with another record."));}
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String,String>> error(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("message",error.getReason()==null?"Request failed":error.getReason()));
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String,String>> malformed() { return ResponseEntity.badRequest().body(Map.of("message","Invalid JSON request body")); }
    @ExceptionHandler({MissingServletRequestParameterException.class,MethodArgumentTypeMismatchException.class})
    ResponseEntity<Map<String,String>> parameters() { return ResponseEntity.badRequest().body(Map.of("message","Missing or invalid query parameter")); }
}
