package in.arogyamitra.platform.config;

import java.util.Map;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;

class OnAppModuleCondition implements Condition {

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        Map<String, Object> attributes = metadata.getAnnotationAttributes(ConditionalOnAppModule.class.getName());
        if (attributes == null) {
            return true;
        }
        String module = (String) attributes.get("value");
        return AppConfigLoader.load(context.getEnvironment()).isModuleEnabled(module);
    }
}
