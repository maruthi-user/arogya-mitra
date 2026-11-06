package in.arogyamitra.platform.service.files;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/** AWS S3 and DigitalOcean Spaces speak the same API; only the client's endpoint differs. */
public class S3FileStorage implements FileStorage {

    private final S3Client client;
    private final String bucket;
    private final String prefix;

    /**
     * @param prefix folder inside the bucket, without slashes at either end; empty for none
     */
    public S3FileStorage(S3Client client, String bucket, String prefix) {
        this.client = client;
        this.bucket = bucket;
        this.prefix =
                prefix == null || prefix.isBlank() ? "" : prefix.replaceAll("^/+|/+$", "") + "/";
    }

    @Override
    public void store(String key, InputStream data, long size, String contentType)
            throws IOException {
        PutObjectRequest request =
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(prefix + key)
                        .contentType(contentType)
                        .build();
        client.putObject(request, RequestBody.fromInputStream(data, size));
    }

    @Override
    public InputStream open(String key) throws IOException {
        try {
            return client.getObject(
                    GetObjectRequest.builder().bucket(bucket).key(prefix + key).build());
        } catch (NoSuchKeyException e) {
            throw new FileNotFoundException("No stored file for key " + key);
        }
    }

    @Override
    public void delete(String key) {
        client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(prefix + key).build());
    }
}
