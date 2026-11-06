package in.arogyamitra.platform.config;

import in.arogyamitra.platform.service.files.FileStorage;
import in.arogyamitra.platform.service.files.LocalFileStorage;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Local storage has no AWS imports, method signatures or runtime dependencies. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnAppModule("files")
public class FileStorageConfiguration {
    @Bean
    @ConditionalOnProperty(name = "storage.provider", havingValue = "local", matchIfMissing = true)
    FileStorage localFileStorage(@Value("${app.files.local-dir:./data/uploads}") String dir) {
        return new LocalFileStorage(Path.of(dir));
    }
}
