package com.mentor.ai.controllers;

import com.mentor.ai.Dto.GithubPushRequest;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/github")
@CrossOrigin(origins = "*")
public class GithubController {

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/push")
    public ResponseEntity<?> pushToGithub(@RequestBody GithubPushRequest request) {
        try {
            // Base API URL for the specific problem folder
            String repoUrlBase = "https://api.github.com/repos/" + request.targetRepo() + "/contents/" + request.problemSlug() + "/";

            // 1. Push the Code File
            String fileExtension = getFileExtension(request.language());
            String codePath = request.problemSlug() + fileExtension;
            String codeMessage = "DSA Mentor: Solved " + request.problemTitle();
            pushFile(repoUrlBase + codePath, request.code(), codeMessage, request.githubToken());

            // 2. Push the README.md
            String readmePath = "README.md";
            String readmeContent = "# " + request.problemTitle() + "\n\n" + request.problemDescription();
            String readmeMessage = "DSA Mentor: Add problem description for " + request.problemTitle();
            pushFile(repoUrlBase + readmePath, readmeContent, readmeMessage, request.githubToken());

            return ResponseEntity.ok(Map.of("success", true, "message", "Code and README pushed successfully!"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    private void pushFile(String apiUrl, String content, String commitMessage, String token) throws Exception {
        String base64Content = Base64.getEncoder().encodeToString(content.getBytes());

        Map<String, String> body = new HashMap<>();
        body.put("message", commitMessage);
        body.put("content", base64Content);

        // GitHub requires the file's SHA if we are overwriting an existing file
        String sha = getFileSha(apiUrl, token);
        if (sha != null) {
            body.put("sha", sha);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        headers.set("Accept", "application/vnd.github.v3+json");

        HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);
        restTemplate.exchange(apiUrl, HttpMethod.PUT, entity, String.class);
    }

    private String getFileSha(String apiUrl, String token) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + token);
            headers.set("Accept", "application/vnd.github.v3+json");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, Map.class);
            return (String) response.getBody().get("sha");
        } catch (HttpClientErrorException.NotFound e) {
            return null; // File doesn't exist yet, safe to create new
        }
    }

    private String getFileExtension(String language) {
        if (language == null) return ".txt";
        return switch (language.toLowerCase()) {
            case "java" -> ".java";
            case "python", "python3" -> ".py";
            case "javascript" -> ".js";
            case "typescript" -> ".ts";
            case "cpp", "c++" -> ".cpp";
            case "c" -> ".c";
            case "csharp", "c#" -> ".cs";
            case "ruby" -> ".rb";
            case "swift" -> ".swift";
            case "golang", "go" -> ".go";
            case "rust" -> ".rs";
            default -> ".txt";
        };
    }
}
