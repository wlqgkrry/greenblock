package com.greenblock.backend.controller;

import com.greenblock.backend.dto.CalendarEventRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/calendar")
public class CalendarController {

    @GetMapping("/events")
    public List<Map<String, Object>> events() {
        return List.of(
                Map.of("title", "Sprint kickoff", "startsAt", "2026-04-14T10:00:00", "workspaceId", 1)
        );
    }

    @PostMapping("/events")
    public Map<String, Object> create(@Valid @RequestBody CalendarEventRequest request) {
        return Map.of(
                "message", "Calendar event payload accepted",
                "title", request.title(),
                "workspaceId", request.workspaceId()
        );
    }

    @DeleteMapping("/events/{eventId}")
    public Map<String, Object> delete(@PathVariable Long eventId) {
        return Map.of("message", "Calendar event deleted", "eventId", eventId);
    }
}
