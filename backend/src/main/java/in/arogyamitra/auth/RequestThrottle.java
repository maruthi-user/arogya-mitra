package in.arogyamitra.auth;

import java.util.concurrent.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class RequestThrottle {
    private record Window(long start,int count){}
    private final ConcurrentMap<String,Window> attempts=new ConcurrentHashMap<>();
    public void check(String key,int limit){
        long now=System.currentTimeMillis();
        if(attempts.size()>10000)attempts.entrySet().removeIf(e->e.getValue().start<now-900000);
        var result=attempts.compute(key,(k,v)->v==null||v.start<now-900000?new Window(now,1):new Window(v.start,v.count+1));
        if(result.count>limit)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Too many attempts. Please try again later.");
    }
}
