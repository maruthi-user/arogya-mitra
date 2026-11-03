package in.arogyamitra.platform.config;
import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import in.arogyamitra.platform.service.files.FileStorage;
import in.arogyamitra.platform.service.files.S3FileStorage;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
/** Cloud dependencies are inspected only after explicitly enabling the cloud profile. */
@Configuration(proxyBeanMethods=false)
@Profile("cloud")
@ConditionalOnClass(name={"software.amazon.awssdk.auth.credentials.AwsCredentials","software.amazon.awssdk.services.s3.S3Client"})
@ConditionalOnAppModule("files")
public class CloudFileStorageConfiguration {
    @Bean
    @ConditionalOnProperty(name = "storage.provider", havingValue = "aws")
    FileStorage awsFileStorage(@Value("${aws.s3.bucket-name}") String bucket,
            @Value("${aws.s3.region}") String region,
            @Value("${aws.s3.access-key}") String accessKey,
            @Value("${aws.s3.secret-key}") String secretKey) {
        S3Client client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
        return new S3FileStorage(client, bucket, "");
    }

    @Bean
    @ConditionalOnProperty(name = "storage.provider", havingValue = "digitalocean")
    FileStorage digitalOceanFileStorage(@Value("${do.space.bucket-name}") String bucket,
            @Value("${do.space.region}") String region,
            @Value("${do.space.endpoint}") String endpoint,
            @Value("${do.space.access-key}") String accessKey,
            @Value("${do.space.secret-key}") String secretKey,
            @Value("${do.space.root-folder:}") String rootFolder) {
        S3Client client = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
        return new S3FileStorage(client, bucket, rootFolder);
    }
}
