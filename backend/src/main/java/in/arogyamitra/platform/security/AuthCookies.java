package in.arogyamitra.platform.security;

import java.net.URI;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import in.arogyamitra.platform.service.auth.SessionService.IssuedTokens;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * The two httpOnly cookies that carry the tokens, so page scripts (and any XSS) can never read them:
 * ACCESS_TOKEN goes with every API call, REFRESH_TOKEN only to the auth endpoints (refresh-path).
 * Unsafe requests that carry them must also send the XSRF-TOKEN cookie back as the X-XSRF-TOKEN header.
 * With the frontend and the API on two subdomains (hrms.fpc.com + api-hrms.fpc.com), domain must be their shared
 * parent (fpc.com), or the frontend cannot read XSRF-TOKEN.
 */
@Component
public class AuthCookies {

    public static final String ACCESS = "ACCESS_TOKEN";
    public static final String REFRESH = "REFRESH_TOKEN";

    private static final Logger log = LoggerFactory.getLogger(AuthCookies.class);

    private final boolean secure;
    private final String sameSite;
    private final String domain;
    private final String refreshPath;
    private final String appUrl;
    private final String frontendUrl;

    public AuthCookies(@Value("${app.security.cookie.secure:true}") boolean secure,
            @Value("${app.security.cookie.same-site:Strict}") String sameSite,
            @Value("${app.security.cookie.domain:}") String domain,
            @Value("${app.security.cookie.refresh-path:/api/v1/auth}") String refreshPath,
            @Value("${app.url:}") String appUrl,
            @Value("${frontend.url:}") String frontendUrl) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.domain = domain == null ? "" : domain.trim();
        this.refreshPath = refreshPath;
        this.appUrl = appUrl;
        this.frontendUrl = frontendUrl;
    }

    /** Warns at startup when the frontend would not be able to read the cookies the API sets. */
    @PostConstruct
    void checkDomain() {
        String api = host(appUrl);
        String frontend = host(frontendUrl);
        if (api == null || frontend == null || api.equals(frontend)) {
            return;
        }
        if (domain.isEmpty()) {
            log.warn("Frontend ({}) and API ({}) are on different hosts but app.security.cookie.domain is empty: "
                    + "the frontend cannot read XSRF-TOKEN and every save will fail with 403. "
                    + "Set COOKIE_DOMAIN to their shared parent domain.", frontend, api);
        } else if (!covers(domain, api) || !covers(domain, frontend)) {
            log.warn("app.security.cookie.domain={} does not cover both the frontend ({}) and the API ({}).",
                    domain, frontend, api);
        }
    }

    private static boolean covers(String domain, String host) {
        String d = domain.toLowerCase(Locale.ROOT).replaceFirst("^\\.", "");
        return host.equals(d) || host.endsWith("." + d);
    }

    private static String host(String url) {
        try {
            String h = url == null || url.isBlank() ? null : URI.create(url.trim()).getHost();
            return h == null ? null : h.toLowerCase(Locale.ROOT);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** Sets the access cookie, and the refresh cookie when a new refresh token was issued. */
    public void write(HttpServletResponse response, IssuedTokens tokens) {
        add(response, ACCESS, tokens.accessToken(), "/", Duration.ofMillis(tokens.accessExpiresInMs()));
        if (tokens.refreshToken() != null) {
            Duration untilExpiry = Duration.between(LocalDateTime.now(), tokens.sessionExpiresAt());
            add(response, REFRESH, tokens.refreshToken(), refreshPath, untilExpiry);
        }
    }

    public void clear(HttpServletResponse response) {
        add(response, ACCESS, "", "/", Duration.ZERO);
        add(response, REFRESH, "", refreshPath, Duration.ZERO);
    }

    public static String read(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                return cookie.getValue();
            }
        }
        return null;
    }

    /** True when the browser sent an auth cookie, i.e. the request could be a cross-site forgery. */
    public static boolean hasAuthCookie(HttpServletRequest request) {
        return read(request, ACCESS) != null || read(request, REFRESH) != null;
    }

    private void add(HttpServletResponse response, String name, String value, String path, Duration maxAge) {
        ResponseCookie.ResponseCookieBuilder cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(path)
                .maxAge(maxAge.isNegative() ? Duration.ZERO : maxAge);
        if (!domain.isEmpty()) {
            cookie.domain(domain);
        }
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.build().toString());
    }

    public boolean isSecure() {
        return secure;
    }

    public String getSameSite() {
        return sameSite;
    }

    public String getDomain() {
        return domain;
    }
}
