import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowRight,
  Check,
  Code2,
  EyeOff,
  Flame,
  Gauge,
  Lightbulb,
  Minimize2,
  Pause,
  Play,
  Sparkles,
  X,
  FolderTree
} from "lucide-react";

import icon32 from "../../../icons/icon32.png";
import icon48 from "../../../icons/icon48.png";
import icon128 from "../../../icons/icon128.png";

type MentorState = "idle" | "github" | "guidance";

const stateLabels: Record<MentorState, string> = {
  idle: "Idle",
  github: "Sync",
  guidance: "Guidance",
};

// Helper to handle Vite's mixed Base64/Path image outputs
const getIconUrl = (iconPath: string) => {
  if (iconPath.startsWith("data:")) return iconPath;
  if (iconPath.startsWith("chrome-extension://")) return iconPath;
  // Strip leading slash if Vite adds it, then apply Chrome's extension URL wrapper
  const cleanPath = iconPath.startsWith("/") ? iconPath.slice(1) : iconPath;
  return chrome.runtime.getURL(cleanPath);
};

function StatusDot({ paused = false }: { paused?: boolean }) {
  return <span aria-hidden="true" className={`status-dot ${paused ? "status-dot-paused" : ""}`} />;
}

function GithubIcon({ size = 24, color = "currentColor" }: { size?: number, color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4"></path>
    </svg>
  );
}

function DsaMentorWidget() {
  const [mentorState, setMentorState] = useState<MentorState>("idle");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isWatching, setIsWatching] = useState(true);
  const [autoPoll, setAutoPoll] = useState(false);
  const [isPracticed, setIsPracticed] = useState(false);
  
  const [githubUser, setGithubUser] = useState<any>(null);
  const [targetRepo, setTargetRepo] = useState("");
  const [repoSaved, setRepoSaved] = useState(false);
  const [submissionDates, setSubmissionDates] = useState<string[]>([]);
  const [streakCount, setStreakCount] = useState(0);

  const [problemName, setProblemName] = useState("Loading...");
  const [streamedResponse, setStreamedResponse] = useState("Waiting for code changes...");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamIdRef = useRef("");

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) {
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const calculateStreak = (dates: string[]) => {
    if (!dates || dates.length === 0) return setStreakCount(0);
    const sortedDates = [...new Set(dates)].sort().reverse();
    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const lastSubDate = new Date(sortedDates[0]);
    lastSubDate.setHours(0,0,0,0);
    const diffDays = Math.floor((today.getTime() - lastSubDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays > 1) return setStreakCount(0);
    let checkDate = new Date(lastSubDate);
    for (const dateStr of sortedDates) {
      const d = new Date(dateStr);
      d.setHours(0,0,0,0);
      if (d.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    setStreakCount(streak);
  };

  useEffect(() => {
    if (chrome && chrome.storage) {
      chrome.storage.local.get(['githubUser', 'targetRepo', 'submissionDates'], (result) => {
        if (result.githubUser) setGithubUser(result.githubUser);
        if (result.targetRepo) setTargetRepo(result.targetRepo);
        if (result.submissionDates) {
          setSubmissionDates(result.submissionDates);
          calculateStreak(result.submissionDates);
        }
      });
      const storageListener = (changes: any) => {
        if (changes.submissionDates) {
          setSubmissionDates(changes.submissionDates.newValue);
          calculateStreak(changes.submissionDates.newValue);
        }
      };
      chrome.storage.onChanged.addListener(storageListener);
      return () => chrome.storage.onChanged.removeListener(storageListener);
    }
  }, []);

  useEffect(() => {
    const slug = window.location.pathname.split('/')[2] || "Current Problem";
    setProblemName(slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
    const messageListener = (msg: any) => {
      if (msg.type === 'ANALYSIS_CHUNK') {
        setIsCollapsed(false);
        setMentorState("guidance");
        if (streamIdRef.current !== msg.requestId) {
          setStreamedResponse(msg.delta);
          streamIdRef.current = msg.requestId;
          setIsStreaming(true);
        } else {
          setStreamedResponse((prev) => prev + msg.delta);
        }
        if (msg.done) setIsStreaming(false);
      }
    };
    if (chrome && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
      return () => chrome.runtime.onMessage.removeListener(messageListener);
    }
  }, []);

  useEffect(() => {
    const getCodeFromEditor = (): Promise<{code: string | null, language: string}> => {
      return new Promise((resolve) => {
        const handler = (e: MessageEvent) => {
          if (e.source !== window || e.data?.type !== 'DSA_MENTOR_CODE_VALUE') return;
          window.removeEventListener('message', handler);
          resolve(e.data.data);
        };
        window.addEventListener('message', handler);
        window.postMessage({ type: 'DSA_MENTOR_REQUEST_CODE' }, '*');
      });
    };
    const handleSubmission = async (event: MessageEvent) => {
      if (event.source !== window || event.data?.type !== 'DSA_MENTOR_ACCEPTED_SUBMISSION') return;
      const { code, language } = await getCodeFromEditor();
      if (!code) return;
      const problemSlug = window.location.pathname.split('/')[2];
      if (!problemSlug) return;
      try {
        const graphqlQuery = {
          query: `query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { title content } }`,
          variables: { titleSlug: problemSlug }
        };
        const leetcodeRes = await fetch("https://leetcode.com/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(graphqlQuery)
        });
        const leetcodeData = await leetcodeRes.json();
        const { title, content } = leetcodeData.data.question;
        chrome.runtime.sendMessage({
          type: "PUSH_TO_GITHUB",
          payload: { code, language, problemSlug, problemTitle: title, problemDescription: content }
        });
      } catch (error) {
        console.error("🔴 DSA Mentor: Failed to fetch problem details", error);
      }
    };
    window.addEventListener('message', handleSubmission);
    return () => window.removeEventListener('message', handleSubmission);
  }, []);

  const handleGithubLogin = () => {
    chrome.runtime.sendMessage({ type: "GITHUB_LOGIN" }, (response) => {
      if (response && response.success) setGithubUser(response.user);
    });
  };

  const handleSaveRepo = () => {
    if (chrome && chrome.storage && targetRepo) {
      const cleanRepo = targetRepo.replace(/^(https?:\/\/)?(www\.)?github\.com\//, '').replace(/\/$/, '');
      chrome.storage.local.set({ targetRepo: cleanRepo }, () => {
        setTargetRepo(cleanRepo);
        setRepoSaved(true);
        setTimeout(() => setRepoSaved(false), 2000);
      });
    }
  };

  const manualAnalyzeAction = () => {
    setMentorState("guidance");
    setIsStreaming(true);
    setStreamedResponse("Reviewing your approach...");
    window.dispatchEvent(new CustomEvent("DSA_MENTOR_FORCE_ANALYZE"));
  };

  if (isCollapsed) {
    return (
      <>
        <style>{styles}</style>
        <button
          type="button"
          aria-label="Expand DSA Mentor"
          className="dsa-avatar-button clay-button"
          onClick={() => setIsCollapsed(false)}
          style={{ position: "absolute", bottom: "24px", right: "24px", pointerEvents: "auto", transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
        >
          <img 
            src={getIconUrl(icon128)} 
            alt="CodeSensei Avatar" 
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
          />
          <span className="dsa-avatar-pulse" />
        </button>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <section 
        className="mentor-card" 
        aria-label="DSA Mentor companion"
        style={{ position: "absolute", bottom: "24px", right: "24px", top: "auto", pointerEvents: "auto", transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      >
        <header 
          className="mentor-header" 
          onPointerDown={handlePointerDown} 
          onPointerMove={handlePointerMove} 
          onPointerUp={handlePointerUp}
        >
          <button type="button" className="bird-button clay-button" aria-label="DSA Mentor avatar" onClick={() => setIsCollapsed(true)}>
             <img 
              src={getIconUrl(icon32)} 
              alt="CodeSensei Header" 
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', margin: 'auto' }} 
            />
          </button>
          <div className="brand-lockup">
            <div className="brand-name">DSA Mentor</div>
            <div className="brand-status">
              <StatusDot paused={!isWatching} />
              {isWatching ? "Noticing your approach" : "Watching paused"}
            </div>
          </div>
          <div className="header-actions">
            <button type="button" className="round-control clay-button" onClick={() => setIsWatching(!isWatching)}>
              {isWatching ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button type="button" className="round-control clay-button" onClick={() => setIsCollapsed(true)}>
              <Minimize2 size={12} />
            </button>
            <button type="button" className="round-control clay-button" onClick={() => setIsCollapsed(true)}>
              <X size={12} />
            </button>
          </div>
        </header>

        <div className="mentor-toolbar">
          <div className="state-switcher clay-inset" role="tablist">
            {(Object.keys(stateLabels) as MentorState[]).map((state) => (
              <button
                key={state}
                type="button"
                role="tab"
                aria-selected={mentorState === state}
                className={`state-tab ${mentorState === state ? "state-tab-active" : ""}`}
                onClick={() => setMentorState(state)}
              >
                {state === "idle" && <EyeOff size={11} />}
                {state === "github" && <GithubIcon size={11} />}
                {state === "guidance" && <Lightbulb size={11} />}
                {stateLabels[state]}
              </button>
            ))}
          </div>
          <div className="toolbar-actions">
            <button type="button" className={`auto-poll clay-button ${autoPoll ? "auto-poll-on" : ""}`} onClick={() => setAutoPoll(!autoPoll)}>
              <span className="toggle-rail"><span className="toggle-knob" /></span>
              Auto-Poll
            </button>
            <div className="streak-pill clay-button">
              <Flame size={13} />
              <span>{streakCount} day streak</span>
            </div>
          </div>
        </div>

        {mentorState === "idle" && (
          <div className="state-body state-body-idle">
            <div className="idle-orb clay-surface">
              <div className="idle-orbit idle-orbit-one" />
              <div className="idle-orbit idle-orbit-two" />
              <div className="idle-orb-center">
                <img 
                  src={getIconUrl(icon48)} 
                  alt="CodeSensei Idle" 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
                />
              </div>
            </div>
            <div className="idle-copy">
              <div className="eyebrow"><StatusDot paused={!isWatching} />QUIET MODE</div>
              <h1>Your thinking space.</h1>
              <p>I&apos;ll stay out of the way while you build a hypothesis. Ask for a nudge when you&apos;re ready.</p>
            </div>
            <button type="button" className="analyze-button clay-button" onClick={manualAnalyzeAction}>
              <Sparkles size={15} />
              Coach My Code
              <span style={{ fontSize: "8px", opacity: 0.7, marginLeft: "4px" }}>[Alt+H]</span>
            </button>
          </div>
        )}

        {mentorState === "github" && (
          <div className="state-body github-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {githubUser ? (
              <>
                <div className="issue-card clay-surface" style={{ display: "block", background: 'linear-gradient(135deg, #e5f6ed, #d3eade)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <img src={githubUser.avatar_url} alt="Profile" style={{ width: '42px', borderRadius: '50%', border: '2px solid #75c39c' }} />
                    <div>
                      <strong style={{ fontSize: '14px', color: '#367968', display: 'block' }}>{githubUser.login}</strong>
                      <span style={{ fontSize: '10px', color: '#528b7b' }}>✓ Connected to GitHub</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', fontSize: '11px', color: '#367968', fontWeight: 600 }}>
                    <Flame size={14} color="#e59a73" /> Current Streak: {streakCount} Days
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px', marginTop: '10px', padding: '0 4px' }}>
                    {[6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
                      const d = new Date();
                      d.setDate(d.getDate() - daysAgo);
                      const dateStr = d.toISOString().split('T')[0];
                      const submitted = submissionDates.includes(dateStr);
                      return (
                        <div 
                          key={daysAgo} 
                          title={dateStr}
                          style={{
                            flex: 1, height: '12px', borderRadius: '3px',
                            backgroundColor: submitted ? '#75c39c' : '#d7dddd',
                            boxShadow: submitted ? 'inset 1px 1px 2px rgba(255,255,255,0.4)' : 'inset 1px 1px 2px rgba(0,0,0,0.05)'
                          }} 
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="clay-surface" style={{ padding: '12px', borderRadius: '14px', background: '#f5f7f5' }}>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: '#7b8885', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Repository</label>
                  <p style={{ fontSize: '10px', color: '#9aa5a2', margin: '4px 0 8px' }}>Where should we push your accepted solutions?</p>
                  <input 
                    type="text" 
                    value={targetRepo}
                    onChange={(e) => setTargetRepo(e.target.value)}
                    placeholder="e.g., prasadduvvada/leet" 
                    style={{ width: '100%', padding: '8px', fontSize: '12px', border: '1px solid #d7dddd', borderRadius: '6px', marginBottom: '8px', boxSizing: 'border-box' }}
                  />
                  <button onClick={handleSaveRepo} className="clay-button" style={{ width: '100%', padding: '8px', background: '#72b9a5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
                    {repoSaved ? "✓ Saved successfully" : "Save Repository"}
                  </button>
                </div>
                <button 
                  onClick={() => {
                    chrome.storage.local.remove(['githubToken', 'githubUser', 'targetRepo']);
                    setGithubUser(null);
                    setTargetRepo("");
                  }}
                  style={{ marginTop: 'auto', padding: '8px', background: 'transparent', color: '#d97777', border: '1px solid #eababa', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                >
                  Disconnect GitHub
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <FolderTree size={36} color="#72b9a5" />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#34403e' }}>Automate Your Portfolio</h3>
                <p style={{ fontSize: '11px', color: '#6c7775', lineHeight: 1.5, marginBottom: '15px' }}>
                  Connect your GitHub account to automatically push your accepted LeetCode solutions directly to your repository and maintain your streak.
                </p>
                <button onClick={handleGithubLogin} className="clay-button" style={{ width: '100%', padding: '12px', background: '#24292f', color: 'white', borderRadius: '24px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                  <GithubIcon size={16} /> Sign in with GitHub
                </button>
              </div>
            )}
          </div>
        )}

        {mentorState === "guidance" && (
          <div className="state-body guidance-body">
            <div className="guidance-topline">
              <div className="eyebrow">
                {isStreaming ? <><span className="live-line" />LIVE READ</> : <><StatusDot />ANALYSIS COMPLETE</>}
              </div>
            </div>
            <div className="problem-row"><h1>{problemName}</h1></div>
            
            <button type="button" className="analyze-button clay-button" onClick={manualAnalyzeAction} disabled={isStreaming}>
              <Code2 size={15} />
              {isStreaming ? "Analyzing..." : "Re-Analyze Code"}
              {!isStreaming && <ArrowRight size={14} />}
            </button>

            <div className="section-heading"><span>AI MENTOR INSIGHTS</span><i /></div>
            <div className="issue-card clay-surface" style={{ display: "block" }}>
              <div style={{ display: "flex", gap: "9px", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", gap: "9px", alignItems: "center" }}>
                   <div className="issue-icon"><Sparkles size={15} /></div>
                   <div className="issue-title">Feedback on your approach</div>
                </div>
                {isStreaming && <div className="streaming-label"><span className="streaming-dot" />Streaming</div>}
              </div>
             <div className="issue-content">
                <div className="mentor-markdown">
                  <ReactMarkdown>{streamedResponse}</ReactMarkdown>
                  {isStreaming && <span className="stream-caret" />}
                </div>
              </div>
            </div>

            <button type="button" className={`practice-button clay-button ${isPracticed ? "practice-button-done" : ""}`} onClick={() => setIsPracticed(!isPracticed)}>
              {isPracticed ? <Check size={14} /> : <Gauge size={14} />}
              {isPracticed ? "Marked for practice" : "Mark this insight for practice"}
            </button>
            <div className="guidance-footer"><span><Sparkles size={12} />A quiet nudge, not the answer</span></div>
          </div>
        )}
      </section>
    </>
  );
}

const styles = `
  :host {
    --ink: #34403e;
    --ink-soft: #6c7775;
    --ink-faint: #929c9a;
    --clay: #eef1f1;
    --clay-deep: #e4e8e8;
    --clay-dark: #aeb7b8;
    --line: #d7dddd;
    --mint: #72b9a5;
    --mint-deep: #3d8474;
    --mint-wash: #dff1e9;
    --peach: #efb79d;
    --peach-wash: #f9e2d7;
    color: var(--ink);
    font-family: "Trebuchet MS", "Segoe UI", sans-serif;
  }
  
  .mentor-card { position: absolute; z-index: 2; width: 360px; max-height: 600px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(255,255,255,.74); border-radius: 29px; background: var(--clay); box-shadow: 14px 18px 32px rgba(8, 13, 15, .34), -3px -3px 9px rgba(255,255,255,.18); animation: card-in .45s ease both; }
  .mentor-header { display: flex; align-items: center; gap: 9px; min-height: 61px; padding: 10px 14px; border-bottom: 1px solid rgba(202,210,210,.72); background: rgba(246,248,247,.48); cursor: grab; }
  .mentor-header:active { cursor: grabbing; }
  
  .bird-button { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: grid; place-items: center; overflow: hidden; } 
  .brand-lockup { flex: 1; min-width: 0; } 
  .brand-name { color: #354d47; font: 17px/1 Georgia, serif; letter-spacing: -.25px; } 
  .brand-status { display: flex; align-items: center; gap: 5px; margin-top: 5px; color: var(--ink-faint); font-size: 9px; white-space: nowrap; }
  
  .header-actions { display: flex; gap: 5px; } .round-control { width: 25px; height: 25px; border-radius: 50%; color: #7c8986; cursor: pointer; } .round-control:hover, .refresh-button:hover { color: var(--mint-deep); }
  
  .mentor-toolbar { padding: 7px 14px 0; } 
  .state-switcher { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; padding: 3px; border-radius: 18px; } 
  .state-tab { display: flex; align-items: center; justify-content: center; gap: 4px; min-width: 0; min-height: 24px; border: 0; border-radius: 13px; color: #899492; background: transparent; cursor: pointer; font: 600 9px "Trebuchet MS", sans-serif; transition: color .2s ease, transform .2s ease, box-shadow .24s cubic-bezier(.2,1.5,.5,1); } .state-tab:hover { color: var(--mint-deep); transform: translateY(-1px); } .state-tab-active { color: #367968; background: linear-gradient(135deg, #e5f6ed, #d3eade); box-shadow: 3px 3px 6px rgba(158,168,166,.32), inset 2px 2px 4px rgba(255,255,255,.9), inset -2px -2px 4px rgba(142,174,161,.25); }
  .toolbar-actions { display: flex; align-items: center; justify-content: space-between; gap: 7px; margin-top: 6px; } .auto-poll, .streak-pill { min-height: 25px; border-radius: 15px; color: #7b8885; font-size: 9px; cursor: pointer; } .auto-poll { display: inline-flex; align-items: center; gap: 6px; padding: 0 9px; } .auto-poll-on { color: #438271; background: linear-gradient(135deg, #e8f7ef, #d2ebe0); } .toggle-rail { display: inline-flex; align-items: center; width: 22px; height: 12px; padding: 2px; border-radius: 8px; background: #bec8c6; box-shadow: inset 2px 2px 4px rgba(120,130,129,.32), inset -1px -1px 2px rgba(255,255,255,.8); } .toggle-knob { width: 8px; height: 8px; border-radius: 50%; background: #f5f7f5; box-shadow: 1px 1px 2px rgba(100,110,108,.32); transform: translateX(0); transition: transform .26s cubic-bezier(.2,1.5,.5,1); } .auto-poll-on .toggle-rail { background: #80bca9; } .auto-poll-on .toggle-knob { transform: translateX(10px); } .streak-pill { display: inline-flex; align-items: center; gap: 5px; padding: 0 10px; color: #af7b58; background: linear-gradient(135deg, #fff0e8, #f5d9ca); } .streak-pill svg { color: #e59a73; }
  
  .state-body { flex: 1; min-height: 0; padding: 12px 14px 10px; overflow: auto; scrollbar-width: thin; scrollbar-color: #c4cecb transparent; animation: body-in .3s ease both; } .state-body::-webkit-scrollbar { width: 4px; } .state-body::-webkit-scrollbar-thumb { border-radius: 5px; background: #c4cecb; }
  .eyebrow { display: flex; align-items: center; gap: 6px; color: #528b7b; font-size: 8px; font-weight: 700; letter-spacing: .13em; } .status-dot { width: 6px; height: 6px; flex: 0 0 6px; border-radius: 50%; background: #7cc9a4; box-shadow: 0 0 0 2px rgba(124,201,164,.14); animation: breathe 1.45s ease-in-out infinite; } .status-dot-paused { background: #e7a16f; box-shadow: 0 0 0 2px rgba(231,161,111,.14); } h1 { margin: 0; color: var(--ink); font: 400 28px/1 Georgia, serif; letter-spacing: -.8px; }
  
  .guidance-topline { display: flex; align-items: center; justify-content: space-between; } .problem-number { color: #9aa5a2; font: 9px ui-monospace, monospace; } .problem-row { display: flex; align-items: baseline; justify-content: space-between; margin-top: 8px; } .problem-subtitle { color: #9aa39f; font: italic 10px Georgia, serif; }
  .analyze-button, .practice-button { display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; min-height: 33px; border: 0; border-radius: 19px; color: #376d60; background: linear-gradient(135deg, #dbf4e8 0%, #d0e9ef 100%); cursor: pointer; font: 700 10px "Trebuchet MS", sans-serif; transition: transform .25s cubic-bezier(.2,1.5,.5,1), box-shadow .25s cubic-bezier(.2,1.5,.5,1), filter .2s ease; } .guidance-body > .analyze-button { margin-top: 9px; } .analyze-button:hover, .practice-button:hover { filter: saturate(1.06); transform: translateY(-2px); box-shadow: 6px 7px 11px rgba(152,164,162,.34), inset 2px 2px 4px rgba(255,255,255,.96), inset -3px -3px 5px rgba(123,163,155,.29); } .analyze-button:active, .practice-button:active, .clay-button:active { transform: translateY(1px) scale(.98); box-shadow: inset 3px 3px 7px rgba(140,148,148,.28), inset -2px -2px 4px rgba(255,255,255,.8); }
  .section-heading { display: flex; align-items: center; gap: 8px; margin: 11px 0 5px; color: #8c9995; font-size: 8px; font-weight: 700; letter-spacing: .14em; } .section-heading span { flex: 0 0 auto; white-space: nowrap; } .section-heading i { width: 100%; height: 1px; background: #d6ddda; }
  
  .clay-surface, .clay-button { box-shadow: 7px 8px 14px rgba(159,168,168,.26), -3px -3px 8px rgba(255,255,255,.94), inset 2px 2px 4px rgba(255,255,255,.82), inset -3px -3px 6px rgba(157,166,165,.25); } .clay-inset { box-shadow: inset 4px 4px 8px rgba(152,163,161,.27), inset -3px -3px 7px rgba(255,255,255,.82); }
  .issue-card { padding: 12px 14px; border-radius: 17px; background: linear-gradient(135deg, #f9e9df, #f4e0d8); } .issue-icon { display: grid; place-items: center; flex: 0 0 25px; height: 25px; border-radius: 50%; color: #c27d59; background: #f6d7c6; box-shadow: inset 2px 2px 4px rgba(255,255,255,.74), inset -2px -2px 4px rgba(183,132,109,.25); } .issue-content { min-width: 0; } .issue-title { color: #876149; font-size: 11px; font-weight: 700; }
  .streaming-label { display: flex; align-items: center; gap: 4px; color: #5e9b87; font: 8px "Trebuchet MS", sans-serif; letter-spacing: 0; } .streaming-dot { width: 5px; height: 5px; border-radius: 50%; background: #75c39c; animation: breathe 1.1s ease-in-out infinite; } .stream-caret { display: inline-block; width: 4px; height: 13px; margin-left: 3px; vertical-align: -2px; border-right: 1px solid #60a58e; animation: blink 1.1s steps(2, jump-none) infinite; }
  .practice-button { min-height: 31px; margin-top: 9px; color: #5a8275; background: linear-gradient(135deg, #edf4f0, #e0e9e8); } .practice-button-done { color: #477b6b; background: linear-gradient(135deg, #dff3e7, #d1e9df); }
  .guidance-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; color: #9aa4a1; font-size: 8px; } .guidance-footer > span { display: flex; align-items: center; gap: 5px; }
  
  .state-body-idle { display: flex; flex-direction: column; align-items: center; padding-top: 24px; text-align: center; } .idle-orb { position: relative; display: grid; place-items: center; width: 140px; height: 140px; border-radius: 50%; background: linear-gradient(145deg, #eff4f1, #dde8e5); } .idle-orbit { position: absolute; border: 1px solid #b8d7cd; border-radius: 50%; } .idle-orbit-one { width: 115px; height: 65px; transform: rotate(-25deg); animation: orbit 8s linear infinite; } .idle-orbit-two { width: 67px; height: 119px; border-color: #e8c8b5; transform: rotate(35deg); animation: orbit-reverse 10s linear infinite; } .idle-orb-center { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 50%; background: #e0efe9; box-shadow: 4px 4px 8px rgba(160,174,169,.25), -3px -3px 7px rgba(255,255,255,.8), inset 2px 2px 4px rgba(255,255,255,.78), inset -2px -2px 4px rgba(139,176,161,.23); overflow: hidden; } .idle-copy { margin-top: 22px; } .idle-copy .eyebrow { justify-content: center; } .idle-copy h1 { margin-top: 9px; } .idle-copy p { max-width: 245px; margin: 10px auto 0; color: var(--ink-soft); font-size: 11px; line-height: 1.55; } .state-body-idle .analyze-button { max-width: 220px; margin-top: 22px; }
  .live-line { width: 6px; height: 6px; border-radius: 50%; background: #e49b71; animation: breathe 1.1s ease-in-out infinite; }
  .clay-button { border: 0; } 
  .dsa-avatar-button { position: relative; display: grid; place-items: center; width: 57px; height: 57px; border-radius: 50%; background: linear-gradient(145deg, #e1f4eb, #c6e4dc); cursor: pointer; } .dsa-avatar-button:hover { transform: translateY(-3px); } .dsa-avatar-pulse { position: absolute; top: 7px; right: 8px; width: 8px; height: 8px; border: 2px solid #d5eee4; border-radius: 50%; background: #7bc9a4; animation: breathe 1.3s ease-in-out infinite; }
  
  @keyframes card-in { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } } @keyframes body-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } } @keyframes breathe { 0%, 100% { opacity: .48; transform: scale(.86); } 50% { opacity: 1; transform: scale(1.12); } } @keyframes blink { 0%, 48% { opacity: 1; } 49%, 100% { opacity: 0; } } @keyframes orbit { to { transform: rotate(335deg); } } @keyframes orbit-reverse { to { transform: rotate(-325deg); } }
`;

export { DsaMentorWidget };