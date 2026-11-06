package in.arogyamitra.platform.config;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.context.annotation.Conditional;

/**
 * Registers the annotated controller, service or configuration only when the module is enabled in
 * app-config.json (or forced with app.modules.NAME.enabled). Put it on every bean of an optional
 * module.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
@Conditional(OnAppModuleCondition.class)
public @interface ConditionalOnAppModule {

    /** Module key, one of {@link AppConfig#KNOWN_MODULES}. */
    String value();
}
