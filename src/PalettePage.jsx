import { useState, useMemo, useEffect } from "react";
import {
  hexToRGB, rgbToOKLCH, getLuminance, wcagContrast,
  REFERENCE_PALETTES, PRESETS, STEP_DEFS, generatePalette,
  ALGORITHMS, recommendedAlgo,
} from "./colorData.js";

// ─── Swatch Card ──────────────────────────────────────────────────────────────

function SwatchCard({ name, step, hex, r, g, b, lum, vsWhite, vsBlack, prevLum }) {
  const [copied, setCopied] = useState(false);
  const useDark = lum > 0.35;
  const tc = useDark ? "rgba(0,0,0,0.80)" : "rgba(255,255,255,0.92)";
  const sc = useDark ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.52)";
  const adjC = prevLum != null ? wcagContrast(lum, prevLum) : null;

  function copy(e) {
    e.stopPropagation();
    navigator.clipboard?.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div
      onClick={copy}
      title={`Click to copy ${hex}`}
      draggable={false}
      style={{
        background: hex, borderRadius: 10, padding: "9px 11px",
        marginBottom: 4, minHeight: 88, display: "flex",
        flexDirection: "column", justifyContent: "space-between",
        boxSizing: "border-box", cursor: "pointer",
        transition: "transform 0.12s, box-shadow 0.12s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.015)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.15)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"; }}
    >
      {copied && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, pointerEvents: "none" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.5)", padding: "3px 8px", borderRadius: 20 }}>Copied!</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: tc, fontFamily: "'SF Mono',monospace", letterSpacing: "-0.02em" }}>{name}-{step}</span>
        <span style={{ fontSize: 10, color: sc, fontFamily: "'SF Mono',monospace" }}>{vsWhite}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: tc, fontFamily: "'SF Mono',monospace" }}>{hex}</span>
        <span style={{ fontSize: 12, color: tc, fontFamily: "'SF Mono',monospace" }}>{vsBlack}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span style={{ fontSize: 9.5, color: sc, fontFamily: "'SF Mono',monospace" }}>({r},{g},{b})</span>
        {adjC && <span style={{ fontSize: 9.5, color: sc, fontFamily: "'SF Mono',monospace" }}>{adjC}</span>}
      </div>
    </div>
  );
}

// ─── Blank Tile (aligned mode placeholder) ───────────────────────────────────

function BlankTile({ step }) {
  return (
    <div style={{
      borderRadius: 10, marginBottom: 4, minHeight: 88,
      boxSizing: "border-box",
      background: "repeating-linear-gradient(-45deg, #fafafa 0, #fafafa 4px, #f3f3f3 4px, #f3f3f3 8px)",
      border: "1px dashed #e8e8e8",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ fontSize: 9, color: "#d8d8d8", fontFamily: "'SF Mono',monospace", letterSpacing: "0.05em" }}>
        — {step} —
      </span>
    </div>
  );
}

// ─── Step label column (aligned mode) ────────────────────────────────────────

function StepLabels({ steps }) {
  return (
    <div style={{ width: 34, flexShrink: 0, marginRight: 4, alignSelf: "flex-start" }}>
      {steps.map(step => (
        <div key={step} style={{
          minHeight: 88, marginBottom: 4, display: "flex",
          alignItems: "center", justifyContent: "flex-end",
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#c8c8c8", fontFamily: "'SF Mono',monospace" }}>
            {step}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── OKLCH Badge ──────────────────────────────────────────────────────────────

function OKLCHBadge({ hex }) {
  const { L, C, H } = useMemo(() => { const { r, g, b } = hexToRGB(hex); return rgbToOKLCH(r, g, b); }, [hex]);
  return (
    <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
      {[["L", L.toFixed(3)], ["C", C.toFixed(3)], ["H", H.toFixed(1) + "°"]].map(([k, v]) => (
        <span key={k} style={{ fontSize: 9.5, background: "#f3f3f3", border: "1px solid #e5e5e5", borderRadius: 5, padding: "2px 5px", fontFamily: "'SF Mono',monospace", color: "#555" }}>
          <span style={{ color: "#999" }}>{k}=</span>{v}
        </span>
      ))}
    </div>
  );
}

// ─── Algorithm Selector ───────────────────────────────────────────────────────

const ALGO_BADGE_COLOR = {
  yellow:  { bg: "#fef9c3", text: "#854d0e" },
  orange:  { bg: "#fff7ed", text: "#9a3412" },
  blue:    { bg: "#eff6ff", text: "#1e40af" },
  stable:  { bg: "#f0fdf4", text: "#166534" },
  default: { bg: "#f3f4f6", text: "#374151" },
};

function AlgoSelector({ color, algo, onAlgoChange }) {
  const recommended = useMemo(() => recommendedAlgo(color), [color]);
  const resolved = algo === "auto" ? recommended : algo;
  const badge = ALGO_BADGE_COLOR[resolved] || ALGO_BADGE_COLOR.default;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: "#bbb", fontFamily: "'SF Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>algorithm</span>
        {algo === "auto" && (
          <span style={{ fontSize: 7.5, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: badge.bg, color: badge.text, fontFamily: "'SF Mono',monospace" }}>
            → {resolved}
          </span>
        )}
      </div>
      <select
        value={algo}
        onChange={e => onAlgoChange(e.target.value)}
        draggable={false}
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: "100%", fontSize: 10, padding: "3px 5px",
          border: "1px solid #e5e5e5", borderRadius: 6,
          background: algo === "auto" ? "#fafafa" : badge.bg,
          color: algo === "auto" ? "#555" : badge.text,
          fontFamily: "'SF Mono',monospace", cursor: "pointer",
          fontWeight: algo !== "auto" && algo !== "default" ? 600 : 400,
        }}
      >
        {ALGORITHMS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
      </select>
    </div>
  );
}

// ─── Palette Header (draggable, fixed height) ─────────────────────────────────

const CTRL_H = 86;

function PaletteHeader({
  id, name, color, step, algo, source,
  onUpdate, onRemove, onSaveToCode,
  isDragging, isDragOver,
  onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const [hexInput, setHexInput] = useState(color);
  useEffect(() => { setHexInput(color); }, [color]);

  const isRef    = source === "ref";
  const isCustom = source === "custom";

  function handleHex(val) {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) onUpdate(id, { color: val });
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        width: 170, margin: "0 6px", flexShrink: 0,
        display: "flex", flexDirection: "column",
        opacity: isDragging ? 0.35 : 1,
        transition: "opacity 0.12s",
        cursor: "grab", userSelect: "none",
        borderTop: isDragOver ? "3px solid #4f46e5" : "3px solid transparent",
        paddingTop: 4, boxSizing: "border-box",
      }}
    >
      {/* ── Name row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 7 }}>
        <span style={{ color: "#d4d4d4", fontSize: 10, letterSpacing: "0.5px", flexShrink: 0, lineHeight: 1 }}>⠿⠿</span>

        {isRef ? (
          <span style={{
            flex: 1, minWidth: 0, fontSize: 13, fontWeight: 800, color: "#222",
            fontFamily: "'Libre Baskerville','Georgia',serif", letterSpacing: "-0.01em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{name}</span>
        ) : (
          <input
            value={name}
            onChange={e => onUpdate(id, { name: e.target.value })}
            draggable={false}
            onMouseDown={e => e.stopPropagation()}
            placeholder="Name"
            title="Click to rename"
            style={{
              flex: 1, minWidth: 0, background: "none", border: "none",
              borderBottom: "2px solid transparent", fontSize: 13, fontWeight: 800,
              color: "#222", outline: "none",
              fontFamily: "'Libre Baskerville','Georgia',serif",
              letterSpacing: "-0.01em", cursor: "text", padding: "0 0 2px",
              transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderBottomColor = "#ddd"}
            onBlur={e => e.target.style.borderBottomColor = "transparent"}
          />
        )}

        {isRef && (
          <span title="Exact reference values — locked" style={{ fontSize: 8, background: "#e8f5e9", color: "#2e7d32", borderRadius: 4, padding: "1px 5px", fontFamily: "'SF Mono',monospace", fontWeight: 700, flexShrink: 0 }}>
            ref
          </span>
        )}
        {isCustom && (
          <span title="User-added custom color — auto-saved" style={{ fontSize: 8, background: "#eff6ff", color: "#1d4ed8", borderRadius: 4, padding: "1px 5px", fontFamily: "'SF Mono',monospace", fontWeight: 700, flexShrink: 0 }}>
            custom
          </span>
        )}
        {isCustom && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(id); }}
            draggable={false}
            onMouseDown={e => e.stopPropagation()}
            title="Delete custom color"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", padding: "0 1px", lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
            onMouseLeave={e => e.currentTarget.style.color = "#ddd"}
          >
            <svg width="11" height="12" viewBox="0 0 11 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 3h9" /><path d="M3.5 3V2a1 1 0 011-1h2a1 1 0 011 1v1" /><path d="M8.5 3l-.4 7a1 1 0 01-1 .9H3.9a1 1 0 01-1-.9L2.5 3" /><path d="M4.5 5.5v3M6.5 5.5v3" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Color row ── */}
      {isRef ? (
        /* Locked display for ref palettes */
        <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, border: "2px solid #e5e5e5", flexShrink: 0, background: color, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }} />
          <span style={{ flex: 1, fontSize: 10, padding: "3px 6px", fontFamily: "'SF Mono',monospace", color: "#aaa", background: "#f5f5f5", borderRadius: 6, border: "1px solid #eee", letterSpacing: "-0.02em" }}>
            {color}
          </span>
        </div>
      ) : (
        /* Editable picker + hex for custom/preset */
        <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 8 }}>
          <label style={{ position: "relative", width: 26, height: 26, borderRadius: 7, overflow: "hidden", border: "2px solid #e5e5e5", cursor: "pointer", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
            <input
              type="color" value={color}
              onChange={e => { setHexInput(e.target.value); onUpdate(id, { color: e.target.value }); }}
              draggable={false}
              onMouseDown={e => e.stopPropagation()}
              style={{ position: "absolute", inset: "-6px", cursor: "pointer", opacity: 0 }}
            />
            <div style={{ width: "100%", height: "100%", background: color }} />
          </label>
          <input
            value={hexInput}
            onChange={e => handleHex(e.target.value)}
            draggable={false}
            onMouseDown={e => e.stopPropagation()}
            style={{ flex: 1, minWidth: 0, fontSize: 10, padding: "3px 6px", border: "1px solid #e5e5e5", borderRadius: 6, fontFamily: "'SF Mono',monospace", color: "#444", outline: "none", background: "#fafafa" }}
            onFocus={e => { e.target.style.borderColor = "#aaa"; e.target.style.background = "#fff"; }}
            onBlur={e => { e.target.style.borderColor = "#e5e5e5"; e.target.style.background = "#fafafa"; }}
          />
        </div>
      )}

      {/* ── Base + Algo OR ref notice — FIXED HEIGHT ── */}
      <div style={{ height: CTRL_H, display: "flex", flexDirection: "column" }}>
        {isRef ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
            padding: "8px 10px", background: "#f9fafb", borderRadius: 8, border: "1px solid #f0f0ef",
          }}>
            <div style={{ fontSize: 9, color: "#bbb", fontFamily: "'SF Mono',monospace", lineHeight: 1.7 }}>
              Exact OKLCH-sourced values<br />No algorithm applied
            </div>
            <div style={{ fontSize: 8, color: "#d4d4d4", marginTop: 4, fontFamily: "'SF Mono',monospace" }}>
              Drag ⠿⠿ to reorder · read-only
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, color: "#bbb", fontFamily: "'SF Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>base</span>
              <select
                value={step}
                onChange={e => onUpdate(id, { step: e.target.value })}
                draggable={false}
                onMouseDown={e => e.stopPropagation()}
                style={{ fontSize: 10, padding: "3px 5px", border: "1px solid #e5e5e5", borderRadius: 6, background: "#fafafa", color: "#555", fontFamily: "'SF Mono',monospace", cursor: "pointer", flex: 1 }}
              >
                {STEP_DEFS.map(s => <option key={s.step} value={s.step}>{s.step}</option>)}
              </select>
            </div>
            <AlgoSelector color={color} algo={algo} onAlgoChange={val => onUpdate(id, { algo: val })} />
          </div>
        )}
      </div>

      {/* ── OKLCH badge ── */}
      <OKLCHBadge hex={color} />

      {/* ── Save to codebase (custom only) ── */}
      {isCustom && (
        <button
          onClick={e => { e.stopPropagation(); onSaveToCode?.(); }}
          draggable={false}
          onMouseDown={e => e.stopPropagation()}
          title="Generate the code snippet to add this color permanently to colorData.js"
          style={{
            marginTop: 8, width: "100%", padding: "5px 0", fontSize: 9.5, fontWeight: 600,
            fontFamily: "'SF Mono',monospace", letterSpacing: "0.03em",
            background: "#f0fdf4", color: "#16a34a",
            border: "1px solid #bbf7d0", borderRadius: 7, cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#dcfce7"; e.currentTarget.style.borderColor = "#86efac"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.borderColor = "#bbf7d0"; }}
        >
          ↑ Save to codebase
        </button>
      )}
    </div>
  );
}

// ─── Save to Codebase Modal ───────────────────────────────────────────────────

const IS_DEV = import.meta.env.DEV;

function SaveCodeModal({ palette, onClose }) {
  // "idle" | "saving" | "saved" | "manual"
  const [status, setStatus] = useState(IS_DEV ? "idle" : "manual");
  const [copied, setCopied] = useState(false);

  const presetLine = `  { name:"${palette.name}", color:"${palette.color}", step:"${palette.step}" },`;

  async function saveDirectly() {
    setStatus("saving");
    try {
      const res = await fetch("/api/save-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: palette.name, color: palette.color, step: palette.step }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("saved");
        // Clear saved palette state so fresh PRESETS load on reload
        try {
          localStorage.removeItem("my-palette-palettes");
          localStorage.removeItem("my-palette-version");
        } catch {}
        setTimeout(() => window.location.reload(), 1800);
      } else {
        setStatus("manual");
      }
    } catch {
      setStatus("manual");
    }
  }

  function copySnippet() {
    navigator.clipboard?.writeText(presetLine);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={status !== "saving" ? onClose : undefined}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 460, maxWidth: "90vw", boxShadow: "0 24px 60px rgba(0,0,0,0.2)", fontFamily: "system-ui,-apple-system,sans-serif" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>Save to Codebase</div>
          {status !== "saving" && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: 20, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Color strip */}
        <div style={{ display: "flex", gap: 2, marginBottom: 20, borderRadius: 8, overflow: "hidden", height: 24 }}>
          {palette.swatches.map(sw => (
            <div key={sw.step} style={{ flex: 1, background: sw.hex }} title={`${sw.step}: ${sw.hex}`} />
          ))}
        </div>

        {/* ── Dev mode: one-click save ── */}
        {IS_DEV && status === "idle" && (
          <>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 18, lineHeight: 1.6 }}>
              This will write <strong>{palette.name}</strong> directly into{" "}
              <code style={{ fontFamily: "'SF Mono',monospace", fontSize: 11, background: "#f3f4f6", padding: "1px 5px", borderRadius: 4 }}>colorData.js</code>,
              commit, and push to GitHub. The page will reload and the color will appear as a permanent preset.
            </div>
            <button
              onClick={saveDirectly}
              style={{
                width: "100%", padding: "11px 0", fontSize: 13, fontWeight: 700,
                borderRadius: 10, border: "none",
                background: "#111", color: "#fff", cursor: "pointer",
              }}
            >
              Save & Push to GitHub →
            </button>
          </>
        )}

        {/* ── Saving spinner ── */}
        {status === "saving" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>⏳</div>
            <div style={{ fontSize: 13, color: "#555" }}>Writing to code and pushing…</div>
          </div>
        )}

        {/* ── Success ── */}
        {status === "saved" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", marginBottom: 6 }}>Saved & pushed!</div>
            <div style={{ fontSize: 12, color: "#999" }}>GitHub is deploying. Reloading page…</div>
          </div>
        )}

        {/* ── Manual fallback (production / API error) ── */}
        {status === "manual" && (
          <>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 14, lineHeight: 1.6 }}>
              Add this line to the <code style={{ fontFamily: "'SF Mono',monospace", fontSize: 11 }}>PRESETS</code> array in{" "}
              <code style={{ fontFamily: "'SF Mono',monospace", fontSize: 11 }}>src/colorData.js</code>, then commit and push.
            </div>
            <div style={{ position: "relative", background: "#f8f8f8", borderRadius: 8, border: "1px solid #eee", padding: "12px 14px", marginBottom: 14 }}>
              <pre style={{ margin: 0, fontSize: 11, fontFamily: "'SF Mono',monospace", color: "#333", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{presetLine}</pre>
              <button
                onClick={copySnippet}
                style={{
                  position: "absolute", top: 8, right: 8,
                  padding: "3px 10px", fontSize: 10, fontWeight: 600,
                  borderRadius: 6, border: "1px solid #e5e5e5",
                  background: copied ? "#dcfce7" : "#fff",
                  color: copied ? "#16a34a" : "#666",
                  cursor: "pointer", fontFamily: "'SF Mono',monospace",
                }}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <div style={{ background: "#111", borderRadius: 8, padding: "10px 14px" }}>
              <pre style={{ margin: 0, fontSize: 10, fontFamily: "'SF Mono',monospace", color: "#86efac", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {`git add src/colorData.js\ngit commit -m "preset: add ${palette.name}"\ngit push`}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Analysis Panel ───────────────────────────────────────────────────────────

function AnalysisCard({ title, items, accent }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 220 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 16, background: accent, borderRadius: 2 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: "#111", fontFamily: "'Libre Baskerville',serif", letterSpacing: "-0.01em" }}>{title}</span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: 11, color: "#666", marginBottom: 6, lineHeight: 1.5 }}>{item}</div>
      ))}
    </div>
  );
}

function AnalysisPanel() {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 12, fontFamily: "'SF Mono',monospace" }}>
        Reverse-Engineered Pattern
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <AnalysisCard accent="#4f46e5" title="Generation Method" items={[
          "✦ OKLCH color space (perceptually uniform)",
          "✦ Chroma interpolates linearly to 0 toward white/black",
          "✦ Hue stays constant throughout the scale",
          "✦ 11 standard steps: 05→10→20→30→40→50→60→70→80→90→100",
        ]} />
        <AnalysisCard accent="#10b981" title="Step Anatomy" items={[
          "05–40  → Tints (high lightness, low chroma)",
          "50–60  → Vivid zone (anchor colors, peak chroma)",
          "60–100 → Shades (low lightness, low chroma)",
          "Numbers: WCAG contrast vs white (small) / black (large)",
        ]} />
        <AnalysisCard accent="#f59e0b" title="Exceptions & Outliers" items={[
          "🔴 Red + Orange have extra step 65 — fills perceptual gap 60→70",
          "🔵 Blue has extra step 55 — fills perceptual gap 50→60",
          "🟡 Yellow dark shades shift toward olive/brown — unavoidable hue shift",
          "Each family has a distinct OKLCH hue angle",
        ]} />
        <AnalysisCard accent="#ec5b5b" title="OKLCH Hue Angles" items={[
          "🔴 Red     H ≈ 25°",
          "🟠 Orange  H ≈ 55°",
          "🟡 Yellow  H ≈ 90°",
          "🟢 Green   H ≈ 155°",
          "🔵 Blue    H ≈ 252°",
          "🟣 Purple  H ≈ 305°",
        ]} />
      </div>
    </div>
  );
}

// ─── Export Dialog ────────────────────────────────────────────────────────────

function ExportModal({ allSwatches, onClose }) {
  const [fmt, setFmt] = useState("css");
  const output = useMemo(() => {
    if (fmt === "css") return `:root {\n` + allSwatches.map(({ name, swatches }) =>
      swatches.map(s => `  --color-${name.toLowerCase()}-${s.step}: ${s.hex};`).join("\n")
    ).join("\n\n") + `\n}`;
    if (fmt === "json") {
      const obj = {};
      allSwatches.forEach(({ name, swatches }) => { obj[name] = {}; swatches.forEach(s => { obj[name][s.step] = s.hex; }); });
      return JSON.stringify(obj, null, 2);
    }
    if (fmt === "ts") return allSwatches.map(({ name, swatches }) =>
      `export const ${name.toLowerCase()} = {\n` + swatches.map(s => `  "${s.step}": "${s.hex}",`).join("\n") + `\n} as const;`
    ).join("\n\n");
    return "";
  }, [fmt, allSwatches]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: 560, maxWidth: "90vw", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#111", fontFamily: "'Libre Baskerville',serif" }}>Export Palette</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {["css", "json", "ts"].map(f => (
            <button key={f} onClick={() => setFmt(f)}
              style={{ padding: "5px 14px", fontSize: 11, borderRadius: 7, border: "1px solid", fontFamily: "'SF Mono',monospace", cursor: "pointer", borderColor: fmt === f ? "#4f46e5" : "#e5e5e5", background: fmt === f ? "#4f46e5" : "#fafafa", color: fmt === f ? "#fff" : "#666", fontWeight: fmt === f ? 700 : 400 }}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <pre style={{ flex: 1, overflow: "auto", background: "#f8f8f8", borderRadius: 10, padding: 16, fontSize: 11, lineHeight: 1.7, fontFamily: "'SF Mono',monospace", color: "#333", margin: 0 }}>{output}</pre>
        <button onClick={() => navigator.clipboard?.writeText(output)}
          style={{ marginTop: 12, padding: "9px 18px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, alignSelf: "flex-end" }}>
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
}

// ─── Palette Page ─────────────────────────────────────────────────────────────

let _uid = PRESETS.length;

const PALETTE_VERSION = 2; // bump when ref palettes change to reset saved state

function initPalettes() {
  try {
    const saved = localStorage.getItem("my-palette-palettes");
    const ver   = Number(localStorage.getItem("my-palette-version") || 0);
    if (saved && ver >= PALETTE_VERSION) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  localStorage.setItem("my-palette-version", String(PALETTE_VERSION));
  return PRESETS.map((p, i) => ({
    id: i, name: p.name, color: p.color, step: p.step, algo: "auto",
    source: REFERENCE_PALETTES[p.color?.toLowerCase()] ? "ref" : "preset",
  }));
}

export default function PalettePage() {
  const [palettes, setPalettes] = useState(initPalettes);
  const [dragId, setDragId]       = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [showAnalysis, setShowAnalysis]   = useState(false);
  const [showExport, setShowExport]       = useState(false);
  const [alignedMode, setAlignedMode]     = useState(false);
  const [saveCodePalette, setSaveCodePalette] = useState(null);

  const allSwatches = useMemo(() =>
    palettes.map(p => ({ ...p, swatches: generatePalette(p.color, p.step, p.algo ?? "auto") })),
    [palettes]
  );

  const allSteps = useMemo(() => {
    if (!alignedMode) return [];
    const stepSet = new Set();
    allSwatches.forEach(p => p.swatches.forEach(sw => stepSet.add(sw.step)));
    return Array.from(stepSet).sort((a, b) => Number(a) - Number(b));
  }, [alignedMode, allSwatches]);

  useEffect(() => {
    try { localStorage.setItem("my-palette-palettes", JSON.stringify(palettes)); } catch {}
  }, [palettes]);

  function reorder(fromId, toId) {
    if (fromId == null || fromId === toId) return;
    setPalettes(prev => {
      const arr = [...prev];
      const from = arr.findIndex(p => p.id === fromId);
      const to   = arr.findIndex(p => p.id === toId);
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }

  function addPalette() {
    setPalettes(prev => [{ id: ++_uid, name: "Custom", color: "#6366f1", step: "50", algo: "auto", source: "custom" }, ...prev]);
  }
  function updatePalette(id, updates) {
    setPalettes(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }
  function removePalette(id) {
    setPalettes(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div style={{ padding: "28px 24px 0" }}>

      {/* ── Fixed-width top section ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#111", fontFamily: "'Libre Baskerville','Georgia',serif", letterSpacing: "-0.03em", lineHeight: 1 }}>
              Swatch Generator
            </h1>
            <p style={{ margin: "5px 0 0", fontSize: 12, color: "#999", fontFamily: "'SF Mono',monospace" }}>
              OKLCH · perceptually uniform · WCAG contrast · drag to reorder
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setShowAnalysis(v => !v)}
              style={{ padding: "7px 14px", fontSize: 11, borderRadius: 8, border: "1px solid #e5e5e5", background: showAnalysis ? "#f0f0ed" : "#fff", cursor: "pointer", color: "#666", fontWeight: 600 }}>
              {showAnalysis ? "Hide" : "Show"} Analysis
            </button>
            <button onClick={() => setShowExport(true)}
              style={{ padding: "7px 14px", fontSize: 11, borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff", cursor: "pointer", color: "#555", fontWeight: 600 }}>
              Export
            </button>
            <button
              onClick={() => setAlignedMode(v => !v)}
              style={{
                padding: "7px 14px", fontSize: 11, borderRadius: 8, cursor: "pointer", fontWeight: 600,
                border: alignedMode ? "1px solid #4f46e5" : "1px solid #e5e5e5",
                background: alignedMode ? "#eef2ff" : "#fff",
                color: alignedMode ? "#4f46e5" : "#666",
                transition: "all 0.15s",
              }}>
              {alignedMode ? "⊞ Aligned" : "⊟ Free flow"}
            </button>
            <button onClick={addPalette}
              style={{ padding: "7px 16px", fontSize: 11, borderRadius: 8, border: "1px solid #4f46e5", background: "#4f46e5", cursor: "pointer", color: "#fff", fontWeight: 700 }}>
              + Add Color
            </button>
          </div>
        </div>

      </div>

      {/* ── Full-width horizontally scrollable area ── */}
      <div style={{
        overflowX: "auto", overflowY: "visible", paddingBottom: 28,
        scrollbarWidth: "thin", scrollbarColor: "#d1d5db #f3f4f6",
      }}>
        {/* HEADER ROW — controls for each palette */}
        <div style={{ display: "flex", width: "max-content", padding: "0 24px", alignItems: "flex-start" }}>
          {/* Spacer matching StepLabels width in aligned mode */}
          {alignedMode && <div style={{ width: 38, flexShrink: 0 }} />}
          {allSwatches.map(p => (
            <PaletteHeader
              key={p.id}
              {...p}
              algo={p.algo ?? "auto"}
              source={p.source ?? "preset"}
              isDragging={dragId === p.id}
              isDragOver={dragOverId === p.id && dragId !== p.id}
              onDragStart={() => setDragId(p.id)}
              onDragOver={e => { e.preventDefault(); setDragOverId(p.id); }}
              onDrop={() => { reorder(dragId, p.id); setDragId(null); setDragOverId(null); }}
              onDragEnd={() => { setDragId(null); setDragOverId(null); }}
              onUpdate={updatePalette}
              onRemove={removePalette}
              onSaveToCode={p.source === "custom" ? () => setSaveCodePalette(p) : undefined}
            />
          ))}
        </div>

        {/* Divider — swatches start consistently below this line for all columns */}
        <div style={{ height: 1, background: "#ebebeb", margin: "12px 30px" }} />

        {/* SWATCH BODY ROW — cards only, no controls */}
        <div style={{ display: "flex", width: "max-content", padding: "0 24px", alignItems: "flex-start" }}>
          {alignedMode ? (
            <>
              <StepLabels steps={allSteps} />
              {allSwatches.map(p => {
                const swatchMap = Object.fromEntries(p.swatches.map(sw => [sw.step, sw]));
                return (
                  <div
                    key={p.id}
                    style={{
                      width: 170, margin: "0 6px", flexShrink: 0,
                      opacity: dragId === p.id ? 0.35 : 1,
                      transition: "opacity 0.12s",
                    }}
                  >
                    {allSteps.map(step => {
                      const sw = swatchMap[step];
                      if (!sw) return <BlankTile key={step} step={step} />;
                      const idx = p.swatches.indexOf(sw);
                      return (
                        <SwatchCard
                          key={step}
                          name={p.name || "color"}
                          {...sw}
                          prevLum={idx > 0 ? p.swatches[idx - 1].lum : null}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </>
          ) : (
            allSwatches.map(p => (
              <div
                key={p.id}
                style={{
                  width: 170, margin: "0 6px", flexShrink: 0,
                  opacity: dragId === p.id ? 0.35 : 1,
                  transition: "opacity 0.12s",
                }}
              >
                {p.swatches.map((sw, i) => (
                  <SwatchCard
                    key={sw.step}
                    name={p.name || "color"}
                    {...sw}
                    prevLum={i > 0 ? p.swatches[i - 1].lum : null}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Below-swatches section: legend + analysis ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 0 0" }}>

        {/* Legend */}
        <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap", alignItems: "center", padding: "10px 14px", background: "#fff", borderRadius: 10, border: "1px solid #f0f0ef" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#ccc", fontFamily: "'SF Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>swatch key</span>
          {[["top-left", "name-step"], ["top-right (sm)", "vs ⬜ white"], ["bottom-left", "rgb values"], ["bottom-right", "vs ⬛ black"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 9, fontFamily: "'SF Mono',monospace", color: "#ccc" }}>{k}</span>
              <span style={{ fontSize: 9, color: "#ddd" }}>→</span>
              <span style={{ fontSize: 9, fontFamily: "'SF Mono',monospace", color: "#999" }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 8, background: "#e8f5e9", color: "#2e7d32", borderRadius: 4, padding: "1px 5px", fontFamily: "'SF Mono',monospace", fontWeight: 700 }}>ref</span>
            <span style={{ fontSize: 9, color: "#ddd" }}>→</span>
            <span style={{ fontSize: 9, fontFamily: "'SF Mono',monospace", color: "#999" }}>exact OKLCH-sourced · locked</span>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 8, background: "#eff6ff", color: "#1d4ed8", borderRadius: 4, padding: "1px 5px", fontFamily: "'SF Mono',monospace", fontWeight: 700 }}>custom</span>
            <span style={{ fontSize: 9, color: "#ddd" }}>→</span>
            <span style={{ fontSize: 9, fontFamily: "'SF Mono',monospace", color: "#999" }}>user-added · auto-saved</span>
          </div>
        </div>

        {showAnalysis && <AnalysisPanel />}
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 24 }}>
        <p style={{ fontSize: 9.5, color: "#ccc", margin: 0, fontFamily: "'SF Mono',monospace", textAlign: "center" }}>
          click any swatch to copy hex · drag header ⠿⠿ to reorder · Auto mode detects algorithm from H° · colors auto-saved to browser
        </p>
      </div>

      {showExport && <ExportModal allSwatches={allSwatches} onClose={() => setShowExport(false)} />}
      {saveCodePalette && <SaveCodeModal palette={saveCodePalette} onClose={() => setSaveCodePalette(null)} />}
    </div>
  );
}
