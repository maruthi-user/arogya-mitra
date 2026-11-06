package in.arogyamitra.platform.service.files;

import java.io.IOException;
import java.io.InputStream;

/**
 * Where bytes live. Local disk by default; S3 or DigitalOcean Spaces by configuration
 * (storage.provider).
 */
public interface FileStorage {

    void store(String key, InputStream data, long size, String contentType) throws IOException;

    InputStream open(String key) throws IOException;

    void delete(String key) throws IOException;
}
