package com.greenblock.backend.repository;

import com.greenblock.backend.entity.CalendarEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {
    List<CalendarEvent> findByWorkspaceIdOrderByStartsAtAsc(Long workspaceId);
}
