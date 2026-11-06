package in.arogyamitra.platform.repository.users;

import in.arogyamitra.platform.entity.users.AppUser;
import in.arogyamitra.platform.entity.users.UserSession;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserSessionRepository extends JpaRepository<UserSession, String> {

    Optional<UserSession> findByRefreshTokenHash(String refreshTokenHash);

    Optional<UserSession> findFirstByPreviousTokenHash(String previousTokenHash);

    /**
     * Runs on every authenticated request: the user, if the session is active and the user is
     * active.
     */
    @Query(
            "select u from UserSession s, AppUser u where s.id = :sid and u.id = s.userId and u.id = :uid"
                    + " and s.revokedAt is null and s.expiresAt > :now"
                    + " and u.status = in.arogyamitra.platform.enums.UserStatus.ACTIVE")
    Optional<AppUser> findActiveUser(
            @Param("sid") String sessionId,
            @Param("uid") Long userId,
            @Param("now") LocalDateTime now);

    @Query(
            "select s from UserSession s where s.userId = :uid and s.revokedAt is null and s.expiresAt > :now"
                    + " order by s.lastSeenAt desc")
    List<UserSession> findActiveByUser(@Param("uid") Long userId, @Param("now") LocalDateTime now);

    @Modifying
    @Query(
            "update UserSession s set s.revokedAt = :now, s.revokeReason = :reason"
                    + " where s.userId = :uid and s.revokedAt is null")
    int revokeAll(
            @Param("uid") Long userId,
            @Param("now") LocalDateTime now,
            @Param("reason") String reason);

    @Modifying
    @Query(
            "update UserSession s set s.revokedAt = :now, s.revokeReason = :reason"
                    + " where s.userId = :uid and s.revokedAt is null and s.id <> :keep")
    int revokeAllExcept(
            @Param("uid") Long userId,
            @Param("keep") String keepSessionId,
            @Param("now") LocalDateTime now,
            @Param("reason") String reason);

    @Modifying
    @Query("delete from UserSession s where s.expiresAt < :before or s.revokedAt < :before")
    int deleteEndedBefore(@Param("before") LocalDateTime before);
}
