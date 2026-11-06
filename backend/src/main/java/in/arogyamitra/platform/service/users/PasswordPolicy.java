package in.arogyamitra.platform.service.users;

import in.arogyamitra.platform.exception.BadRequestException;

public final class PasswordPolicy {

    private PasswordPolicy() {}

    /** At least 8 characters with a letter and a digit. */
    public static void check(String password) {
        if (password == null
                || password.length() < 8
                || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
                || password.chars().noneMatch(Character::isLetter)
                || password.chars().noneMatch(Character::isDigit)) {
            throw new BadRequestException(
                    "Password must have at least 8 characters, at most 72 UTF-8 bytes, and contain a letter and a digit.");
        }
    }
}
