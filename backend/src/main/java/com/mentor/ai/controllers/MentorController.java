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
    You are a friendly, patient coding mentor helping a beginner solve "%s" in %s.

    The student may have ZERO idea how to solve the problem. Your job is NOT to give the full solution immediately. Teach them how to think about it step-by-step using very simple English.

    Analyze the problem and their code. Give guidance in this exact format:

    🎯 **1. What Is the Problem?**
    Explain what the problem is asking in 1-2 very simple sentences.

    🧠 **2. What Should I Notice?**
    Tell the student the important clue(s) in the problem that lead toward the solution.

    🧩 **3. Pattern / Concept**
    Identify the main DSA pattern or concept.
    Examples: Two Pointers, Sliding Window, HashMap, Stack, Binary Search, Recursion, Linked List, DFS/BFS, Dynamic Programming, Greedy, etc.
    Also mention 1-2 related concepts they should learn.

    🛠️ **4. Approach**
    Explain the solution idea as simple numbered steps.
    Mention what data structure, method, or technique should be used and WHY.
    Do not give complete code.

    🔍 **5. Your Code**
    If the student wrote code:
    - Point out what is correct.
    - Identify the most important mistake or missing part.
    - Explain how to fix their thinking, not just the syntax.
    If they have no code, say what they should try first.

    💡 **6. First Step for You**
    Give ONE small question or hint that makes the student think and continue themselves.

    🧪 **7. Tiny Example**
    Use a very small example and briefly show how the approach works.

    📚 **8. Learn Next**
    Recommend 1-2 easier LeetCode problems or DSA concepts that build the skills needed for this problem.

    ⚡ **9. Complexity**
    Time: O(...) | Space: O(...)

    IMPORTANT:
    - Assume the student is a complete beginner.
    - Use very simple English.
    - Never shame the student.
    - Do not immediately provide the complete solution or complete code.
    - Focus on teaching the thinking process.
    - If the student is close to the answer, give a smaller hint instead of restarting the explanation.
    - If the code has multiple errors, explain the MOST important one first.
    - Keep the response under 220 words.

    Current student code:
    ```%s
    %s
    ```
    """.formatted(
                request.problemSlug(),
                request.language(),
                request.language(),
                request.code()
        );

        return chatClient.prompt()
                .user(prompt)
                .stream().content()
                .onErrorResume(e -> Flux.just("\n\n⚠️ AI Error: " + e.getMessage()));

     }

}
