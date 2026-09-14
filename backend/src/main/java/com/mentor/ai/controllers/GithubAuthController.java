package com.mentor.ai.controllers;

import org.springframework.beans.factory.annotation.Value; // <-- Correct Spring import
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class GithubAuthController {

    @Value("${spring.security.oauth2.client.registration.github.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.registration.github.client-secret}")
    private String clientSecret;

    public record AuthRequest(String code) {}

    @PostMapping("/github")
    public ResponseEntity<?> exchangeCodeForToken(@RequestBody AuthRequest request) {
        RestTemplate restTemplate = new RestTemplate();
        String githubUrl = "https://github.com/login/oauth/access_token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Accept", "application/json");

        Map<String, String> payload = Map.of(
                "client_id", clientId,
                "client_secret", clientSecret,
                "code", request.code()
        );

        HttpEntity<Map<String, String>> entity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(githubUrl, entity, Map.class);
            System.out.println("GitHub OAuth Response: " + response.getBody());
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to exchange token"));
        }
    }
}