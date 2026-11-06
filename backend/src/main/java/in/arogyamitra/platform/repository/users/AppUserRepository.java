package in.arogyamitra.platform.repository.users;

import in.arogyamitra.platform.entity.users.AppUser;
import in.arogyamitra.platform.enums.UserStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository
        extends JpaRepository<AppUser, Long>,
                org.springframework.data.jpa.repository.JpaSpecificationExecutor<AppUser> {

    Optional<AppUser> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    Optional<AppUser> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    List<AppUser> findByRoleAndStatus(String role, UserStatus status);

    List<AppUser> findByIdIn(Collection<Long> ids);

    @Query("select u from AppUser u where lower(u.email) like :q or lower(u.username) like :q")
    Page<AppUser> search(@Param("q") String likeQuery, Pageable pageable);
}
