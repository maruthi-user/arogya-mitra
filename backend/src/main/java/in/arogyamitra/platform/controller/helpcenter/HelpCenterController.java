package in.arogyamitra.platform.controller.helpcenter;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import in.arogyamitra.platform.config.ConditionalOnAppModule;
import in.arogyamitra.platform.service.helpcenter.HelpCenterService;

/** Public (see SecurityConfiguration): help content is static and holds nothing private. */
@RestController
@RequestMapping("/api/v1/help-center")
@ConditionalOnAppModule("help")
public class HelpCenterController {

    private final HelpCenterService help;

    public HelpCenterController(HelpCenterService help) {
        this.help = help;
    }

    @GetMapping
    public JsonNode content() {
        return help.content();
    }
}
