package in.arogyamitra.platform.repository.users;

import in.arogyamitra.platform.entity.users.PasswordResetToken;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime since);

    @Modifying
    @Query(
            "update PasswordResetToken t set t.usedAt = :now where t.userId = :userId and t.usedAt is null")
    int invalidateOpenTokens(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
