package com.greenblock.backend.controller;

import com.greenblock.backend.dto.TeammateRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teammates")
public class TeammateController {

    @GetMapping
    public List<Map<String, Object>> list() {
        return List.of(
                Map.of("name", "Yena Kim", "archetype", "Respect-sensitive planner"),
                Map.of("name", "Doyun Park", "archetype", "Context-first collaborator")
        );
    }

    @PostMapping
    public Map<String, Object> create(@Valid @RequestBody TeammateRequest request) {
        return Map.of(
                "message", "Teammate payload accepted",
                "name", request.name(),
                "email", request.email(),
                "birthPlace", request.birthPlace()
        );
    }

    @GetMapping("/{teammateId}/analysis")
    public Map<String, Object> analysis(@PathVariable Long teammateId) {
        return Map.of(
                "teammateId", teammateId,
                "mansaeSource", "Official provider integration pending",
                "archetype", "Respect-sensitive planner",
                "messageGuide", "Lead with context and a respectful opener."
        );
    }
}
