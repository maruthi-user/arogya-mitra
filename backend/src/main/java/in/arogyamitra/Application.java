package in.arogyamitra;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@org.springframework.scheduling.annotation.EnableScheduling
@SpringBootApplication(nameGenerator=org.springframework.context.annotation.FullyQualifiedAnnotationBeanNameGenerator.class)
public class Application {
    public static void main(String[] args) { SpringApplication.run(Application.class, args); }
}
