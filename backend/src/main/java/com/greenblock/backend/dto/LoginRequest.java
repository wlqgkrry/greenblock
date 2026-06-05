package com.greenblock.backend.dto;

import com.greenblock.backend.domain.CalendarType;
import com.greenblock.backend.domain.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LoginRequest(
        @NotBlank String name,
        @Email @NotBlank String email,
        @NotBlank String role,
        @NotBlank String provider,
        @NotNull Gender gender,
        @NotBlank String birthDate,
        @NotBlank String birthTime,
        @NotBlank String birthPlace,
        @NotNull CalendarType calendarType
) {
}
