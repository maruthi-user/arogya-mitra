package in.arogyamitra.platform.service.files;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

public class LocalFileStorage implements FileStorage {

    private final Path root;

    public LocalFileStorage(Path root) {
        this.root = root.toAbsolutePath().normalize();
    }

    @Override
    public void store(String key, InputStream data, long size, String contentType)
            throws IOException {
        Path target = resolve(key);
        Files.createDirectories(target.getParent());
        Files.copy(data, target, StandardCopyOption.REPLACE_EXISTING);
    }

    @Override
    public InputStream open(String key) throws IOException {
        Path file = resolve(key);
        if (!Files.isRegularFile(file)) {
            throw new FileNotFoundException("No stored file for key " + key);
        }
        return Files.newInputStream(file);
    }

    @Override
    public void delete(String key) throws IOException {
        Files.deleteIfExists(resolve(key));
    }

    /**
     * Keys are generated server-side, but never trust that: refuse anything that escapes the root.
     */
    private Path resolve(String key) {
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage key.");
        }
        return resolved;
    }
}
