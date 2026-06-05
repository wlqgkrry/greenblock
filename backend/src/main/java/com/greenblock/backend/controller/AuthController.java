package com.greenblock.backend.controller;

import com.greenblock.backend.dto.LoginRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest request) {
        return Map.of(
                "message", "Stub endpoint ready for social login integration",
                "email", request.email(),
                "provider", request.provider(),
                "birthPlace", request.birthPlace()
        );
    }
}
