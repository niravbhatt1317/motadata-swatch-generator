import { useState, useEffect, useRef } from "react";
import PalettePage from "./PalettePage.jsx";
import PatternPage from "./PatternPage.jsx";
import NeutralPage from "./NeutralPage.jsx";
import CorrelationPage from "./CorrelationPage.jsx";
import ColorSciencePage from "./ColorSciencePage.jsx";

// ─── Dev access ───────────────────────────────────────────────────────────────

const DEV_PW = "Trames@1317";
const SESSION_KEY = "mp-dev";

function isSessionAuthed() {
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
}
function setSessionAuthed() {
  try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
}

// ─── Password modal ───────────────────────────────────────────────────────────

function DevModal({ onSuccess, onCancel }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function submit(e) {
    e.preventDefault();
    if (val === DEV_PW) {
      setSessionAuthed();
      onSuccess();
    } else {
      setErr(true);
      setVal("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#fff", borderRadius: 14, padding: "28px 30px", width: 320,
          boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
          fontFamily: "system-ui,-apple-system,sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111", marginBottom: 5 }}>
            Developer Access
          </div>
          <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>
            Enter the password to unlock hidden pages.
          </div>
        </div>

        <form onSubmit={submit}>
          <input
            ref={inputRef}
            type="password"
            value={val}
            autoComplete="off"
            placeholder="Password"
            onChange={e => { setVal(e.target.value); setErr(false); }}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "9px 12px", fontSize: 13,
              border: err ? "1.5px solid #ef4444" : "1.5px solid #e5e5e5",
              borderRadius: 8, outline: "none",
              fontFamily: "'SF Mono',monospace",
              background: err ? "#fef2f2" : "#fafafa",
              marginBottom: err ? 6 : 16,
              transition: "border-color 0.15s, background 0.15s",
            }}
            onFocus={e => { if (!err) e.target.style.borderColor = "#a5b4fc"; }}
            onBlur={e => { if (!err) e.target.style.borderColor = "#e5e5e5"; }}
          />
          {err && (
            <div style={{ fontSize: 11, color: "#ef4444", marginBottom: 14, fontFamily: "'SF Mono',monospace" }}>
              Incorrect password. Try again.
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button" onClick={onCancel}
              style={{
                flex: 1, padding: "9px 0", fontSize: 12, fontWeight: 600,
                borderRadius: 8, border: "1px solid #e5e5e5",
                background: "#fff", color: "#666", cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 2, padding: "9px 0", fontSize: 12, fontWeight: 700,
                borderRadius: 8, border: "none",
                background: "#111", color: "#fff", cursor: "pointer",
              }}
            >
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Nav link ─────────────────────────────────────────────────────────────────

function NavLink({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "13px 20px", fontSize: 12, fontWeight: active ? 700 : 500,
      color: active ? "#111" : "#999",
      background: "none", border: "none", borderBottom: active ? "2px solid #111" : "2px solid transparent",
      cursor: "pointer", fontFamily: "system-ui,-apple-system,sans-serif",
      transition: "color 0.15s, border-color 0.15s", lineHeight: 1,
    }}>
      {children}
    </button>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("palette");

  // Strip cache-bust param from address bar without reloading
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has("_cb")) {
      p.delete("_cb");
      const clean = window.location.pathname + (p.toString() ? "?" + p.toString() : "");
      window.history.replaceState(null, "", clean);
    }
  }, []);

  const wantsDevFromURL = new URLSearchParams(window.location.search).has("dev");

  // Immediately unlock if URL has ?dev AND session was already authed
  const [devMode, setDevMode] = useState(() => wantsDevFromURL && isSessionAuthed());

  // Show modal when ?dev is in URL but not yet authenticated this session
  const [showModal, setShowModal] = useState(() => wantsDevFromURL && !isSessionAuthed());

  // Keyboard shortcut: type "palette" anywhere outside an input
  useEffect(() => {
    const seq = "palette";
    let typed = "";
    function onKey(e) {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) return;
      typed = (typed + e.key).slice(-seq.length);
      if (typed === seq) {
        typed = "";
        // Already in dev mode → toggle off; otherwise prompt for password
        setDevMode(v => {
          if (v) return false;
          setShowModal(true);
          return false;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Snap back to main page when dev mode is turned off
  useEffect(() => {
    if (!devMode && page !== "palette") setPage("palette");
  }, [devMode]);

  function handleAuthSuccess() {
    setShowModal(false);
    setDevMode(true);
  }

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", background: "#f7f7f5", minHeight: "100vh" }}>
      <nav style={{
        display: "flex", gap: 0, alignItems: "center",
        background: "#fff", borderBottom: "1px solid #eee",
        padding: "0 24px", position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#aaa", marginRight: 20, fontFamily: "'SF Mono',monospace", letterSpacing: "-0.02em" }}>
          Motadata Swatches
        </span>
        <NavLink active={page === "palette"} onClick={() => setPage("palette")}>
          Swatch Generator
        </NavLink>
        {devMode && (
          <>
            <NavLink active={page === "pattern"} onClick={() => setPage("pattern")}>
              Pattern Analysis
            </NavLink>
            <NavLink active={page === "neutral"} onClick={() => setPage("neutral")}>
              Neutral Palette
            </NavLink>
            <NavLink active={page === "correlation"} onClick={() => setPage("correlation")}>
              Correlation
            </NavLink>
            <NavLink active={page === "science"} onClick={() => setPage("science")}>
              Color Science
            </NavLink>
            <span style={{
              marginLeft: "auto", fontSize: 9, fontFamily: "'SF Mono',monospace",
              color: "#d1d5db", padding: "0 4px", letterSpacing: "0.06em", userSelect: "none",
            }}>
              dev
            </span>
          </>
        )}
      </nav>

      {page === "palette"     && <PalettePage />}
      {page === "pattern"     && <PatternPage />}
      {page === "neutral"     && <NeutralPage />}
      {page === "correlation" && <CorrelationPage />}
      {page === "science"     && <ColorSciencePage />}

      {/* Dev access footer */}
      {!devMode && (
        <div style={{
          margin: "48px auto 0", maxWidth: 420, padding: "18px 24px 28px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 11, color: "#ccc", marginBottom: 10, fontFamily: "system-ui,-apple-system,sans-serif", lineHeight: 1.6 }}>
            This tool has additional pages for pattern analysis, color science,<br />
            correlation, and neutral palettes — accessible to developers only.
          </div>
          <a
            href="?dev"
            style={{
              display: "inline-block", fontSize: 11, fontWeight: 600,
              color: "#bbb", textDecoration: "none",
              border: "1px solid #e5e5e5", borderRadius: 8,
              padding: "7px 18px", fontFamily: "system-ui,-apple-system,sans-serif",
              background: "#fff", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#bbb"; e.currentTarget.style.color = "#555"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e5e5"; e.currentTarget.style.color = "#bbb"; }}
          >
            Access Developer Pages →
          </a>
        </div>
      )}

      {showModal && (
        <DevModal
          onSuccess={handleAuthSuccess}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
