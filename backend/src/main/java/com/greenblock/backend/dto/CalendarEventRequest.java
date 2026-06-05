package com.greenblock.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CalendarEventRequest(
        @NotNull Long workspaceId,
        @NotNull Long createdByUserId,
        @NotBlank String title,
        String description,
        @NotBlank String startsAt,
        @NotBlank String endsAt
) {
}
