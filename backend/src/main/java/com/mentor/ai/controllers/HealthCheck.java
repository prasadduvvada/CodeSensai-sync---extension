package com.mentor.ai.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class HealthCheck {

    @GetMapping("/healthCheck")
    public String healthCheck() {
        try {
            return "Health checked";
        } catch (Exception e) {
            return "Something wrong...."+e.getMessage();
        }
    }
}
