package in.arogyamitra.platform.controller.app;

import in.arogyamitra.platform.config.AppConfig;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * What the UI needs to build itself: branding, enabled modules, labels, dropdowns and role names.
 * Public (no secrets, no role permissions) so the login screen can already show the product name.
 */
@RestController
@RequestMapping("/api/v1/app")
public class AppConfigController {

    private final AppConfig config;

    public AppConfigController(AppConfig config) {
        this.config = config;
    }

    @GetMapping("/config")
    public Map<String, Object> config() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("app", config.app());
        out.put("modules", config.enabledModules());
        out.put("labels", config.labels());
        out.put("dropdowns", config.dropdowns());
        out.put("roles", config.roles().keySet().stream().sorted().toList());
        return out;
    }
}
