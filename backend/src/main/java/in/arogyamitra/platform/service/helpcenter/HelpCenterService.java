package in.arogyamitra.platform.service.helpcenter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.arogyamitra.platform.config.ConditionalOnAppModule;
import in.arogyamitra.platform.exception.ResourceNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

/**
 * Serves help content from one JSON file (app.help.location, default
 * classpath:help/help-center.json), so each company ships its own content with no code change. Read
 * once, then cached.
 */
@Service
@ConditionalOnAppModule("help")
public class HelpCenterService {

    private final ObjectMapper mapper;
    private final String location;
    private volatile JsonNode cached;

    public HelpCenterService(
            ObjectMapper mapper,
            @Value("${app.help.location:classpath:help/help-center.json}") String location) {
        this.mapper = mapper;
        this.location = location;
    }

    public JsonNode content() {
        JsonNode local = cached;
        if (local == null) {
            synchronized (this) {
                if (cached == null) {
                    cached = load();
                }
                local = cached;
            }
        }
        return local;
    }

    private JsonNode load() {
        Resource resource = new DefaultResourceLoader().getResource(location);
        if (!resource.exists()) {
            throw new ResourceNotFoundException("Help content is not available.");
        }
        try (InputStream in = resource.getInputStream()) {
            return mapper.readTree(in);
        } catch (IOException e) {
            throw new IllegalStateException("Help content could not be read.", e);
        }
    }
}
