package in.arogyamitra.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/** Password reset/account deactivation invalidates existing authenticated sessions. */
public class AccountSessionFilter extends OncePerRequestFilter {
    private final JdbcTemplate db;
    public AccountSessionFilter(JdbcTemplate db){this.db=db;}
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException{
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth!=null&&auth.getPrincipal() instanceof Identity identity&&!identity.accountId().isBlank()){
            var valid=db.queryForObject("SELECT COUNT(*) FROM accounts WHERE id=? AND active=TRUE AND credential_version=?",Integer.class,identity.accountId(),identity.credentialVersion());
            if(valid==null||valid==0){var session=request.getSession(false);if(session!=null)session.invalidate();SecurityContextHolder.clearContext();}
        }
        chain.doFilter(request,response);
    }
}
