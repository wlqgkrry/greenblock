package com.greenblock.backend.repository;

import com.greenblock.backend.entity.TeammateLink;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeammateLinkRepository extends JpaRepository<TeammateLink, Long> {
    List<TeammateLink> findByOwnerUser_Id(Long ownerUserId);
}
