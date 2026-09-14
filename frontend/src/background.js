console.log("🟢 BACKGROUND ROUTER: Booted up and listening!");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ANALYZE') {
    const tabId = sender?.tab?.id;
    if (!tabId) return;
    
    streamFromSpringBoot(msg, tabId);
  }
});

async function streamFromSpringBoot(msg, tabId) {
  try {
    console.log("🟢 BACKGROUND: Connecting to Spring Boot REST API...");
    
    const response = await fetch('http://localhost:8080/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    
    let buffer = ""; 
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1); 
        
        if (line.startsWith('data:')) {
          const rawText = line.substring(5);
          const text = line.trim() === 'data:' ? '\n\n' : rawText.startsWith(' ') ? rawText.substring(1) : rawText;
          
          if (text) {
             chrome.tabs.sendMessage(tabId, {
               type: 'ANALYSIS_CHUNK',
               requestId: msg.requestId,
               delta: text, 
               done: false
             });
          }
        }
      }
    }

    chrome.tabs.sendMessage(tabId, {
      type: 'ANALYSIS_CHUNK',
      requestId: msg.requestId,
      delta: '',
      done: true
    });

  } catch (error) {
    console.error("🔴 BACKGROUND ERROR:", error);
    chrome.tabs.sendMessage(tabId, {
      type: 'ANALYSIS_CHUNK',
      requestId: msg.requestId,
      delta: `\n\n⚠️ Error: Could not connect to Spring Boot.`,
      done: true
    });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GITHUB_LOGIN") {
    const CLIENT_ID = "Ov23liGc6Ts4IcUUYOKr"; 
    const REDIRECT_URL = chrome.identity.getRedirectURL();
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URL)}&scope=repo`;

    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          sendResponse({ success: false, error: chrome.runtime.lastError });
          return;
        }

        const urlParams = new URLSearchParams(new URL(redirectUrl).search);
        const code = urlParams.get("code");

        if (code) {
          try {
            const response = await fetch("http://localhost:8080/api/auth/github", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code })
            });
            const data = await response.json();

            if (data.access_token) {
              const userResponse = await fetch("https://api.github.com/user", {
                headers: { Authorization: `Bearer ${data.access_token}` }
              });
              const userData = await userResponse.json();

              chrome.storage.local.set({ githubToken: data.access_token, githubUser: userData }, () => {
                sendResponse({ success: true, user: userData });
              });
            } else {
              sendResponse({ success: false, error: "No access token returned" });
            }
          } catch (error) {
             sendResponse({ success: false, error: error.message });
          }
        }
      }
    );
    return true; 
  }

  // NEW: Listen for the push command and track streak dates
  if (message.type === "PUSH_TO_GITHUB") {
    chrome.storage.local.get(['githubToken', 'targetRepo'], async (data) => {
      if (!data.githubToken || !data.targetRepo) return;

      const pushRequest = {
        githubToken: data.githubToken,
        targetRepo: data.targetRepo,
        problemSlug: message.payload.problemSlug,
        problemTitle: message.payload.problemTitle,
        problemDescription: message.payload.problemDescription,
        code: message.payload.code,
        language: message.payload.language
      };

      try {
        const response = await fetch("http://localhost:8080/api/github/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pushRequest)
        });
        
        if (response.ok) {
          const today = new Date().toISOString().split('T')[0];
          chrome.storage.local.get(['submissionDates'], (storage) => {
            let dates = storage.submissionDates || [];
            if (!dates.includes(today)) {
              dates.push(today);
              chrome.storage.local.set({ submissionDates: dates });
            }
          });
        }
      } catch (error) {
        console.error("🔴 Failed to connect to Spring Boot backend:", error);
      }
    });
    return true; 
  }
});