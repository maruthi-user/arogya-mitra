package in.arogyamitra.platform.config;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.core.env.Environment;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.arogyamitra.platform.config.AppConfig.ModuleConfig;

/**
 * Reads and validates app-config.json. Static on purpose: the module toggles are needed while the
 * Spring context is still being assembled (see {@link OnAppModuleCondition}), before any bean exists.
 * A bad file stops startup with every problem listed, instead of failing later on a request.
 */
public final class AppConfigLoader {

    public static final String LOCATION_PROPERTY = "app.config.location";
    public static final String DEFAULT_LOCATION = "classpath:app-config.json";

    private static final Pattern KEY = Pattern.compile("[A-Za-z][A-Za-z0-9_]*");

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private AppConfigLoader() {
    }

    public static AppConfig load(Environment env) {
        String location = env.getProperty(LOCATION_PROPERTY, DEFAULT_LOCATION);
        Resource resource = new DefaultResourceLoader().getResource(location);
        AppConfig parsed;
        try (InputStream in = resource.getInputStream()) {
            parsed = MAPPER.readValue(in, AppConfig.class);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read application config '" + location + "': " + e.getMessage(), e);
        }
        AppConfig config = withEnvironmentOverrides(parsed, env);
        validate(config, location);
        return config;
    }

    /** app.modules.&lt;name&gt;.enabled in the environment wins over the JSON file. */
    private static AppConfig withEnvironmentOverrides(AppConfig base, Environment env) {
        Map<String, ModuleConfig> modules = new HashMap<>(base.modules());
        for (String module : AppConfig.KNOWN_MODULES) {
            Boolean override = env.getProperty("app.modules." + module + ".enabled", Boolean.class);
            if (override != null) {
                modules.put(module, new ModuleConfig(override));
            }
        }
        return new AppConfig(base.app(), modules, base.labels(), base.roles(), base.dropdowns());
    }

    static void validate(AppConfig config, String location) {
        List<String> errors = new ArrayList<>();

        for (String module : config.modules().keySet()) {
            if (!AppConfig.KNOWN_MODULES.contains(module)) {
                errors.add("modules." + module + ": unknown module (known: " + AppConfig.KNOWN_MODULES + ")");
            }
        }
        if (config.roles().isEmpty()) {
            errors.add("roles: define at least one role");
        }
        for (var role : config.roles().entrySet()) {
            if (!KEY.matcher(role.getKey()).matches()) {
                errors.add("roles." + role.getKey() + ": role names are letters, digits and underscore");
            }
        }

        if (!errors.isEmpty()) {
            throw new IllegalStateException(
                    "Invalid application config '" + location + "':\n - " + String.join("\n - ", errors));
        }
    }
}
