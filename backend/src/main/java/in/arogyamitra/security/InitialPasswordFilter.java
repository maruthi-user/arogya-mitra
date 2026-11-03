package in.arogyamitra.security;

import java.io.IOException;
import java.util.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.arogyamitra.platform.security.CurrentUser;

/** Temporary credentials grant password-change access only, across both API families. */
public class InitialPasswordFilter extends OncePerRequestFilter {
 private final JdbcTemplate db;private final ObjectMapper json;
 private static final Set<String> ALLOWED=Set.of("/api/auth/csrf","/api/auth/session","/api/auth/login","/api/auth/logout","/api/auth/change-initial-password","/api/v1/auth/login","/api/v1/auth/logout","/api/reference-data","/api/v1/app/config");
 public InitialPasswordFilter(JdbcTemplate db,ObjectMapper json){this.db=db;this.json=json;}
 @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException{
  String path=request.getRequestURI().substring(request.getContextPath().length());
  if(path.startsWith("/api/")&&!request.getMethod().equals("OPTIONS")&&!ALLOWED.contains(path)){
   var auth=SecurityContextHolder.getContext().getAuthentication();
   String account=null,username=null;
   if(auth!=null&&auth.getPrincipal() instanceof Identity identity)account=identity.accountId();
   if(auth!=null&&auth.getPrincipal() instanceof CurrentUser user)username=user.getDisplayName();
   Integer required=account!=null&&!account.isBlank()?db.queryForObject("SELECT COUNT(*) FROM accounts WHERE id=? AND must_change_password=TRUE",Integer.class,account):username!=null?db.queryForObject("SELECT COUNT(*) FROM accounts WHERE username=? AND must_change_password=TRUE",Integer.class,username):0;
   if(required!=null&&required>0){response.setStatus(403);response.setContentType("application/json");json.writeValue(response.getOutputStream(),Map.of("code","PASSWORD_CHANGE_REQUIRED","message","Change your temporary password before accessing your account."));return;}
  }
  chain.doFilter(request,response);
 }
}
