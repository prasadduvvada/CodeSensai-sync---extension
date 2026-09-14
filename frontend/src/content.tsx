import React from "react";
import ReactDOM from "react-dom/client";
import { DsaMentorWidget } from "./components/mockups/mockups/DsaMentorWidget";
import css from "./index.css?inline";

console.log("🚀 DSA Mentor: Content Script starting...");

function injectMainWorldScript() {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('injected.js');
  s.onload = () => s.remove();
  (document.head || document.documentElement).appendChild(s);
}

function getCurrentEditorData(): Promise<{code: string | null, language: string}> {
  return new Promise((resolve) => {
    const handler = (e: MessageEvent) => {
      if (e.source !== window || e.data?.type !== 'DSA_MENTOR_CODE_VALUE') return;
      window.removeEventListener('message', handler);
      resolve(e.data.data); 
    };
    window.addEventListener('message', handler);
    window.postMessage({ type: 'DSA_MENTOR_REQUEST_CODE' }, '*');
  });
}

function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

let lastCodeHash: number | null = null;

window.addEventListener("DSA_MENTOR_FORCE_ANALYZE", () => {
  lastCodeHash = null; 
  pollAndAnalyze();
});

async function pollAndAnalyze() {
  const { code, language } = await getCurrentEditorData();
  if (!code) return;

  const hash = simpleHash(code);
  if (hash === lastCodeHash) return; 
  lastCodeHash = hash;
  
  const problemSlug = window.location.pathname.split('/')[2] || "unknown";

  chrome.runtime.sendMessage({
    type: 'ANALYZE',
    requestId: crypto.randomUUID(),
    code: code,
    language: language, 
    problemSlug: problemSlug
  });
}

function initWidget() {
  if (document.getElementById("dsa-mentor-host")) return;

  injectMainWorldScript();

  const host = document.createElement("div");
  host.id = "dsa-mentor-host";
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = css;
  shadow.appendChild(style);

  const rootDiv = document.createElement("div");
  rootDiv.id = "dsa-mentor-root";
  rootDiv.style.cssText = "position:absolute;inset:0;"; 
  shadow.appendChild(rootDiv);

  ReactDOM.createRoot(rootDiv).render(
    <React.StrictMode>
      <DsaMentorWidget />
    </React.StrictMode>
  );

  console.log("✅ DSA Mentor: Widget mounted and manual mode active!");
}

if (document.body) {
  initWidget();
} else {
  document.addEventListener("DOMContentLoaded", initWidget);
}