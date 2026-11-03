package in.arogyamitra;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import org.springframework.boot.test.context.FilteredClassLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import in.arogyamitra.platform.config.FileStorageConfiguration;
import in.arogyamitra.platform.config.CloudFileStorageConfiguration;
import in.arogyamitra.platform.service.files.FileStorage;
import in.arogyamitra.platform.service.files.LocalFileStorage;
import static org.assertj.core.api.Assertions.assertThat;
class LocalStorageStartupTest {
 @TempDir Path files;
 @Test void localStorageStartsWithoutAnyAwsSdkClasses(){
  new ApplicationContextRunner().withClassLoader(new FilteredClassLoader("software.amazon.awssdk"))
   .withUserConfiguration(FileStorageConfiguration.class,CloudFileStorageConfiguration.class)
   .withPropertyValues("storage.provider=local","app.files.local-dir="+files)
   .run(context->{assertThat(context).hasNotFailed().hasSingleBean(FileStorage.class);assertThat(context.getBean(FileStorage.class)).isInstanceOf(LocalFileStorage.class);assertThat(context).doesNotHaveBean(CloudFileStorageConfiguration.class);});
 }
}
