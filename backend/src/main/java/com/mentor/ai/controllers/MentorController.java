package com.mentor.ai.controllers;

import com.mentor.ai.Dto.AnalyzeRequest;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api")
public class MentorController {

    private final ChatClient chatClient;

    public MentorController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }
    @PostMapping (value = "/analyze", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> analyzeCode(@RequestBody AnalyzeRequest request){
        String prompt = """
            You are a friendly, highly encouraging coding mentor helping a beginner student solve "%s" in %s.
            Use VERY simple, basic English. Avoid complex jargon. Be super easy to understand.
            Analyze their code and provide guidance in this exact markdown format. Keep it under 130 words total.
            
            🎯 **Approach**: (1 super simple sentence about their logic. Be encouraging!)
            
            🔍 **Sharp Eye**: (Point out 1 bug, typo, or edge case cleanly. Keep it very simple.)
            
            💡 **Simple Nudge**: (A simple, easy-to-understand question or clue to help them figure out the next step.)
            
            📚 **Before This Try**: (List 1 or 2 easier LeetCode problems they should practice if this one is too hard.)
            
            ⚡ **Complexity**: Time: O(...) | Space: O(...)
            
            Current student code:
            ```%s
            %s
            ```
            """.formatted(request.problemSlug(), request.language(), request.language(), request.code());

        return chatClient.prompt()
                .user(prompt)
                .stream().content()
                .onErrorResume(e -> Flux.just("\n\n⚠️ AI Error: " + e.getMessage()));

     }

}
