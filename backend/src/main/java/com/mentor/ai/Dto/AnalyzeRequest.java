package com.mentor.ai.Dto;

public record AnalyzeRequest(
        String code,
        String language,
        String problemSlug,
        String requestId
) {
}
