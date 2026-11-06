package in.arogyamitra.platform.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Everything that changes between products, read from app-config.json: which modules are on,
 * labels, roles and their permissions, and dropdown lists. Code never hardcodes these.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AppConfig(
        AppInfo app,
        Map<String, ModuleConfig> modules,
        Map<String, String> labels,
        Map<String, List<String>> roles,
        Map<String, List<String>> dropdowns) {

    /** Every optional module the template knows. A module not mentioned in the JSON is off. */
    public static final Set<String> KNOWN_MODULES =
            Set.of("audit", "files", "help", "email", "passwordreset");

    private static final Set<String> ON_BY_DEFAULT = Set.of();

    public AppConfig {
        app = app == null ? new AppInfo("Application", "") : app;
        modules = modules == null ? Map.of() : Map.copyOf(modules);
        labels = labels == null ? Map.of() : Map.copyOf(labels);
        roles = roles == null ? Map.of() : Map.copyOf(roles);
        dropdowns = dropdowns == null ? Map.of() : Map.copyOf(dropdowns);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AppInfo(String name, String company) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ModuleConfig(boolean enabled) {}

    // ------------------------------------------------------------------ lookups

    public boolean isModuleEnabled(String module) {
        ModuleConfig cfg = modules.get(module);
        return cfg != null ? cfg.enabled() : ON_BY_DEFAULT.contains(module);
    }

    public List<String> enabledModules() {
        return KNOWN_MODULES.stream().filter(this::isModuleEnabled).sorted().toList();
    }

    public String label(String key, String fallback) {
        return labels.getOrDefault(key, fallback);
    }

    public List<String> dropdown(String name, List<String> fallback) {
        List<String> values = dropdowns.get(name);
        return values == null || values.isEmpty() ? fallback : values;
    }

    public List<String> permissionsOf(String role) {
        return roles.getOrDefault(role, List.of());
    }

    public boolean roleExists(String role) {
        return roles.containsKey(role);
    }
}
