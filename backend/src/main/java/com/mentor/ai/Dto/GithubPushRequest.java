package com.mentor.ai.Dto;

public record GithubPushRequest(
        String githubToken,
        String targetRepo,
        String problemSlug,
        String problemTitle,
        String problemDescription,
        String code,
        String language
) {}