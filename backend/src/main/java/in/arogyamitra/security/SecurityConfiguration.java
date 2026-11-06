package in.arogyamitra.security;

import static org.springframework.security.config.Customizer.withDefaults;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.arogyamitra.platform.security.JwtAuthenticationFilter;
import in.arogyamitra.platform.security.JwtService;
import in.arogyamitra.platform.service.auth.SessionService;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.*;
import org.springframework.security.web.csrf.*;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfiguration {
    @Bean
    PasswordEncoder passwords() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    SecurityContextRepository contexts() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    CsrfTokenRepository csrfTokens() {
        var tokens = new HttpSessionCsrfTokenRepository();
        tokens.setHeaderName("X-XSRF-TOKEN");
        return tokens;
    }

    @Bean
    UserDetailsService unusedDefaultUser() {
        return username -> {
            throw new UsernameNotFoundException("Use the application login API");
        };
    }

    @Bean
    SecurityFilterChain security(
            HttpSecurity http,
            ObjectMapper json,
            SecurityContextRepository contexts,
            CsrfTokenRepository tokens,
            JdbcTemplate db,
            JwtService jwt,
            SessionService sessions)
            throws Exception {
        http.cors(withDefaults())
                .csrf(
                        csrf ->
                                csrf.csrfTokenRepository(tokens)
                                        .csrfTokenRequestHandler(
                                                new CsrfTokenRequestAttributeHandler())
                                        .ignoringRequestMatchers(
                                                "/api/v1/auth/login",
                                                "/api/v1/auth/forgot-password",
                                                "/api/v1/auth/reset-password"))
                .addFilterAfter(
                        new JwtAuthenticationFilter(jwt, sessions),
                        SecurityContextHolderFilter.class)
                .addFilterAfter(new AccountSessionFilter(db), JwtAuthenticationFilter.class)
                .addFilterAfter(new InitialPasswordFilter(db, json), AccountSessionFilter.class)
                .addFilterAfter(new XsrfCookieFilter(), CsrfFilter.class)
                .securityContext(context -> context.securityContextRepository(contexts))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(
                        auth ->
                                auth.requestMatchers("/api/admin/**")
                                        .hasRole("ADMIN")
                                        .requestMatchers("/api/verification/**")
                                        .hasAnyRole("VERIFIER", "ADMIN")
                                        .requestMatchers(
                                                "/api/v1/auth/login",
                                                "/api/v1/auth/refresh",
                                                "/api/v1/auth/logout",
                                                "/api/v1/app/config",
                                                "/api/v1/help-center/**")
                                        .permitAll()
                                        // Public healthcare routes: sign-in/registration flows and
                                        // the read-only catalog patients browse before booking.
                                        .requestMatchers(
                                                "/api/auth/**",
                                                "/api/state",
                                                "/api/reference-data",
                                                "/error",
                                                "/actuator/health",
                                                "/actuator/health/**")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/providers",
                                                "/api/providers/{id}",
                                                "/api/providers/{id}/slots",
                                                "/api/care/services",
                                                "/api/care/services/{id}/availability")
                                        .permitAll()
                                        // Everything else under /api needs a signed-in user; the
                                        // controllers still check the role and record ownership.
                                        .requestMatchers("/api/**")
                                        .authenticated()
                                        .anyRequest()
                                        .denyAll())
                .exceptionHandling(
                        errors ->
                                errors.authenticationEntryPoint(
                                                (req, res, e) -> {
                                                    res.setStatus(401);
                                                    res.setContentType("application/json");
                                                    json.writeValue(
                                                            res.getOutputStream(),
                                                            Map.of("message", "Please sign in"));
                                                })
                                        .accessDeniedHandler(
                                                (req, res, e) -> {
                                                    res.setStatus(403);
                                                    res.setContentType("application/json");
                                                    json.writeValue(
                                                            res.getOutputStream(),
                                                            e instanceof CsrfException
                                                                    ? Map.of(
                                                                            "code",
                                                                            "CSRF_INVALID",
                                                                            "message",
                                                                            "Your security token has expired. Please try again.")
                                                                    : Map.of(
                                                                            "code",
                                                                            "ACCESS_DENIED",
                                                                            "message",
                                                                            "Access denied. You do not have permission for this action."));
                                                }));
        return http.build();
    }

    static class XsrfCookieFilter extends OncePerRequestFilter {
        protected void doFilterInternal(
                HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                throws ServletException, IOException {
            var token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (token != null) {
                var cookie = new Cookie("XSRF-TOKEN", token.getToken());
                cookie.setPath("/");
                cookie.setHttpOnly(false);
                cookie.setSecure(request.isSecure());
                cookie.setAttribute("SameSite", "Lax");
                response.addCookie(cookie);
            }
            chain.doFilter(request, response);
        }
    }
}
