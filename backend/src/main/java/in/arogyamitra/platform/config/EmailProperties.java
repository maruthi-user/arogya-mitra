package in.arogyamitra.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 *
 *
 * <pre>
 * app.email.from-address=no-reply@example.com   (required when spring.mail.host is set)
 * app.email.from-name=Example Co
 * app.email.product-name=                       (blank: "app.name" from app-config.json)
 * app.email.company-name=                       (blank: "app.company" from app-config.json)
 * app.email.logo-url=https://example.com/logo.png
 * app.email.async=true                          (send on a background thread; false = in the calling thread)
 * </pre>
 *
 * SMTP itself is configured with the standard spring.mail.* properties. With no spring.mail.host,
 * emails are logged (recipient and subject only) and not sent.
 */
@ConfigurationProperties(prefix = "app.email")
public class EmailProperties {

    private String fromAddress;
    private String fromName = "";
    private String productName = "";
    private String companyName = "";
    private String logoUrl = "";
    private boolean async = true;

    public String getFromAddress() {
        return fromAddress;
    }

    public void setFromAddress(String fromAddress) {
        this.fromAddress = fromAddress;
    }

    public String getFromName() {
        return fromName;
    }

    public void setFromName(String fromName) {
        this.fromName = fromName;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public boolean isAsync() {
        return async;
    }

    public void setAsync(boolean async) {
        this.async = async;
    }
}
