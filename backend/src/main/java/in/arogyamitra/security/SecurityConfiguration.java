package in.arogyamitra.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.*;
import org.springframework.security.web.context.*;
import static org.springframework.security.config.Customizer.withDefaults;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.core.userdetails.*;

@Configuration
public class SecurityConfiguration {
    @Bean PasswordEncoder passwords(){return new BCryptPasswordEncoder(12);}
    @Bean SecurityContextRepository contexts(){return new HttpSessionSecurityContextRepository();}
    @Bean CsrfTokenRepository csrfTokens(){return new HttpSessionCsrfTokenRepository();}
    @Bean UserDetailsService unusedDefaultUser(){return username->{throw new UsernameNotFoundException("Use the application login API");};}
    @Bean SecurityFilterChain security(HttpSecurity http,ObjectMapper json,SecurityContextRepository contexts,CsrfTokenRepository tokens,JdbcTemplate db)throws Exception{
        http.cors(withDefaults()).csrf(csrf->csrf.csrfTokenRepository(tokens).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .addFilterAfter(new AccountSessionFilter(db),SecurityContextHolderFilter.class)
            .securityContext(context->context.securityContextRepository(contexts))
            .formLogin(AbstractHttpConfigurer::disable).httpBasic(AbstractHttpConfigurer::disable).logout(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth->auth.requestMatchers("/api/admin/**").hasRole("ADMIN").anyRequest().permitAll())
            .exceptionHandling(errors->errors.authenticationEntryPoint((req,res,e)->{res.setStatus(401);res.setContentType("application/json");json.writeValue(res.getOutputStream(),Map.of("message","Please sign in"));})
                .accessDeniedHandler((req,res,e)->{res.setStatus(403);res.setContentType("application/json");json.writeValue(res.getOutputStream(),Map.of("message","Access denied or expired security token. Refresh and try again."));}));
        return http.build();
    }
}
