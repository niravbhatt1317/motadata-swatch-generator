import { useState, useMemo } from "react";
import {
  hexToRGB, rgbToOKLCH, wcagContrast, getLuminance,
  FAMILY_ANCHORS, REFERENCE_PALETTES, classifyFamily,
} from "./colorData.js";

// ─── Family metadata (static guidance) ────────────────────────────────────────

const FAMILY_GUIDE = {
  Red: {
    driftLevel: "Low",  driftBar: 0.15,
    mechanism: "sRGB-stable zone",
    lightNote: "Light reds look pink — correct, expected behavior",
    darkNote: "Dark reds collapse toward brown-black after step 80",
    algoNote: "Standard L interpolation · linear C reduction · no H correction needed",
    extraSteps: "Step 65 added in reference to smooth the 60→70 transition",
    why: "Red sits in a geometrically regular part of the OKLCH gamut. The sRGB primaries are well-separated from the red hue boundary, so as you darken or lighten a red, there is plenty of \"room\" to stay inside sRGB without bending the hue angle.",
  },
  Orange: {
    driftLevel: "High",  driftBar: 0.72,
    mechanism: "Yellow-edge instability",
    lightNote: "Light oranges drift toward peach-pink as H climbs toward red",
    darkNote: "Dark oranges drift toward red-brown as C collapses",
    algoNote: "H correction: +5° toward red at dark end · C reduces faster on light side",
    extraSteps: "Step 65 added (same as Red) — the 60→70 gap is especially rough for orange",
    why: "Orange straddles the yellow-red boundary of the sRGB gamut. The gamut 'wall' here is not flat — it curves inward. As you try to hold orange's hue at varying lightness, the shortest path to a valid sRGB color tilts toward red-brown in the dark and toward peach-pink in the light. The reference palette absorbs this drift intentionally.",
  },
  Yellow: {
    driftLevel: "Highest",  driftBar: 1.0,
    mechanism: "Gamut boundary + extreme high-L base",
    lightNote: "Yellow-50 is ALREADY at L≈0.90 — lightest base of all families. Steps 05–40 have almost zero L room; they distinguish themselves only through C reduction.",
    darkNote: "Dark yellow = olive/khaki. This is physically unavoidable: no dark color at H=93° stays inside sRGB at meaningful chroma. The reference palette leans into brown-gold tones at step 80+.",
    algoNote: "Completely different L strategy: light steps reduce C only. Dark steps need aggressive L drop AND H drift toward orange (≈+15°) to stay perceptually warm rather than olive.",
    extraSteps: "No step 65 — yellow's 60→70 is already a compression zone. Steps 70–100 cover a narrow L range (0.46→0.20).",
    why: "Yellow is special because its \"peak chroma\" L value is near white (≈0.97 in OKLCH). There is almost no dark-yellow space inside sRGB. The moment you reduce L below 0.6 for a saturated yellow, you hit the gamut wall and must sacrifice either hue or chroma — both cause visible drift. No palette generator can avoid this; it's physics.",
  },
  Green: {
    driftLevel: "Low",  driftBar: 0.18,
    mechanism: "Largest sRGB gamut region",
    lightNote: "Very light greens risk looking 'neon lime' if C isn't reduced fast enough",
    darkNote: "Dark greens are stable — a wide L range stays inside gamut at moderate C",
    algoNote: "Standard L interpolation · C reduces at 1.2× normal rate on light side · no H correction",
    extraSteps: "No extra steps — standard 11-step structure works cleanly",
    why: "Green occupies the widest hue range in the sRGB gamut. The primary green channel (0,255,0) in sRGB corresponds to a very high-chroma OKLCH green, giving the algorithm plenty of gamut budget to work with at every lightness level. Hue angle barely needs to change as L varies.",
  },
  Blue: {
    driftLevel: "Medium",  driftBar: 0.42,
    mechanism: "Two combined effects",
    lightNote: "Low-chroma instability: at very low C (light steps), H is mathematically noisy — tiny RGB changes swing H by 10°+ near the achromatic axis",
    darkNote: "Azure-boundary drift: #008cff sits near the cyan↔blue cusp. Light steps trend toward periwinkle, dark steps trend toward navy-indigo",
    algoNote: "Standard L interpolation · moderate C reduction · pin H to base value in generator to resist drift",
    extraSteps: "Step 55 added in reference — the gap between vivid blue-50 and darker blue-60 needed a bridge for interactive states (hover, focus rings)",
    why: "Blue's medium drift has TWO causes. First: the specific shade #008cff is an 'azure' blue near the perceptual cyan-blue boundary (H≈252°). The gamut surface curves here so lighter blues drift toward sky-blue and darker blues toward indigo. Second: ALL colors exhibit H instability when C drops below ~0.03 near the achromatic axis — the arc-tangent that computes H becomes noisy. Blue's light steps sit in this unstable zone.",
  },
  Purple: {
    driftLevel: "Low",  driftBar: 0.2,
    mechanism: "sRGB-stable zone",
    lightNote: "Light purples become lavender — expected, desired behavior",
    darkNote: "Dark purples go very dark very fast: purple-80 (~L=0.30) already reads as near-black",
    algoNote: "Standard L interpolation · compress dark-end steps — consider extra step at 85 for fine dark control",
    extraSteps: "Standard 11 steps. If dark control matters (e.g. dark-mode UI), add step 85.",
    why: "Purple sits in a geometrically calm part of the OKLCH gamut, between red and blue primaries. The hue angle H≈307° is well-supported at most lightness levels. The main challenge is perceptual: humans perceive purple as 'dark' even at moderate L, so dark purples need finer step spacing than the standard scale provides.",
  },
};

const FAMILY_COLOR = {
  Red: "#ec5b5b", Orange: "#fa9950", Yellow: "#fad100",
  Green: "#36d576", Blue: "#008cff", Purple: "#8c5bd8",
};

// ─── Hue zone data ────────────────────────────────────────────────────────────

function useHueZones() {
  return useMemo(() => {
    // Sort anchors by H to compute zone boundaries
    const sorted = [...FAMILY_ANCHORS].sort((a, b) => a.H - b.H);
    const n = sorted.length;
    return sorted.map((anchor, i) => {
      const prev = sorted[(i - 1 + n) % n];
      const next = sorted[(i + 1) % n];
      let lo = (anchor.H + prev.H) / 2;
      let hi = (anchor.H + next.H) / 2;
      // Handle wrap-around for Red (near 0°/360°)
      if (anchor.H < 50 && prev.H > 200) lo = ((anchor.H + (prev.H - 360)) / 2 + 360) % 360;
      if (anchor.H < 50 && next.H > 200) hi = (anchor.H + next.H - 360) / 2;
      return { ...anchor, lo, hi };
    });
  }, []);
}

// ─── Actual ΔH stats from reference palettes ──────────────────────────────────

function useDriftStats() {
  return useMemo(() => FAMILY_ANCHORS.map(anchor => {
    const ref = REFERENCE_PALETTES[anchor.color.toLowerCase()];
    if (!ref) return { ...anchor, maxDH: 0, avgDH: 0 };
    const dHs = ref.swatches.map(({ hex }) => {
      const { r, g, b } = hexToRGB(hex);
      const { H } = rgbToOKLCH(r, g, b);
      let d = Math.abs(H - anchor.H);
      if (d > 180) d = 360 - d;
      return d;
    });
    return {
      ...anchor,
      maxDH: Math.max(...dHs),
      avgDH: dHs.reduce((a, b) => a + b, 0) / dHs.length,
    };
  }), []);
}

// ─── Hue bar ──────────────────────────────────────────────────────────────────

function HueBar({ anchors, highlight }) {
  const width = 680;
  const h = 32;
  const ticks = [0, 60, 90, 120, 180, 240, 270, 300, 360];

  return (
    <svg width={width} height={h + 36} style={{ display: "block", overflow: "visible" }}>
      {/* Gradient bar */}
      <defs>
        <linearGradient id="hueGrad" x1="0" x2="1" y1="0" y2="0">
          {Array.from({ length: 37 }, (_, i) => (
            <stop key={i} offset={`${(i / 36) * 100}%`}
              stopColor={`oklch(0.65 0.15 ${i * 10})`} />
          ))}
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={width} height={h} rx={6} fill="url(#hueGrad)" opacity={0.55} />

      {/* Tick marks and labels */}
      {ticks.map(t => (
        <g key={t}>
          <line x1={(t / 360) * width} y1={h} x2={(t / 360) * width} y2={h + 5} stroke="#ccc" strokeWidth={1} />
          <text x={(t / 360) * width} y={h + 14} textAnchor="middle" fontSize={7.5} fill="#aaa" fontFamily="'SF Mono',monospace">{t}°</text>
        </g>
      ))}

      {/* Anchor dots */}
      {anchors.map(a => {
        const x = (a.H / 360) * width;
        const isHL = highlight === a.name;
        return (
          <g key={a.name}>
            <circle cx={x} cy={h / 2} r={isHL ? 9 : 7}
              fill={FAMILY_COLOR[a.name]} stroke="white" strokeWidth={isHL ? 2.5 : 1.5} />
            <text x={x} y={h + 25} textAnchor="middle" fontSize={8} fontWeight={700}
              fill={isHL ? FAMILY_COLOR[a.name] : "#888"}>
              {a.name}
            </text>
            <text x={x} y={h + 33} textAnchor="middle" fontSize={7} fill="#bbb" fontFamily="'SF Mono',monospace">
              {a.H.toFixed(0)}°
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Drift bar chart ──────────────────────────────────────────────────────────

function DriftBars({ stats }) {
  const sorted = [...stats].sort((a, b) => b.maxDH - a.maxDH);
  const maxVal = Math.max(...stats.map(s => s.maxDH));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sorted.map(s => (
        <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 52, fontSize: 9, fontWeight: 700, color: FAMILY_COLOR[s.name], fontFamily: "'SF Mono',monospace", textAlign: "right" }}>{s.name}</div>
          <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 12, position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${(s.maxDH / maxVal) * 100}%`,
              background: FAMILY_COLOR[s.name], opacity: 0.6, borderRadius: 4,
            }} />
          </div>
          <div style={{ width: 48, fontSize: 9, color: "#555", fontFamily: "'SF Mono',monospace" }}>
            max {s.maxDH.toFixed(1)}°
          </div>
          <div style={{ width: 48, fontSize: 9, color: "#aaa", fontFamily: "'SF Mono',monospace" }}>
            avg {s.avgDH.toFixed(1)}°
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Interactive classifier ───────────────────────────────────────────────────

function isValidHex(s) { return /^#[0-9a-f]{6}$/i.test(s); }

function ClassifierInput({ onResult }) {
  const [raw, setRaw] = useState("#008cff");

  const result = useMemo(() => {
    const hex = raw.trim();
    if (!isValidHex(hex)) return null;
    return classifyFamily(hex);
  }, [raw]);

  // surface result to parent
  useMemo(() => { onResult(result); }, [result, onResult]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: isValidHex(raw.trim()) ? raw.trim() : "#eee",
          border: "1px solid rgba(0,0,0,0.12)", flexShrink: 0,
        }} />
        <input
          type="text"
          value={raw}
          onChange={e => setRaw(e.target.value)}
          placeholder="#rrggbb"
          style={{
            fontFamily: "'SF Mono',monospace", fontSize: 13, padding: "8px 12px",
            border: "1.5px solid #ddd", borderRadius: 8, outline: "none", width: 120,
            color: "#111", background: "#fff",
          }}
        />
        <input
          type="color"
          value={isValidHex(raw.trim()) ? raw.trim() : "#008cff"}
          onChange={e => setRaw(e.target.value)}
          style={{ width: 36, height: 36, padding: 2, border: "1.5px solid #ddd", borderRadius: 8, cursor: "pointer", background: "#fff" }}
        />
      </div>
      {result && (
        <div style={{ display: "flex", gap: 16 }}>
          {[["L", result.L.toFixed(3)], ["C", result.C.toFixed(3)], ["H", result.H.toFixed(1) + "°"]].map(([k, v]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8.5, color: "#aaa", fontFamily: "'SF Mono',monospace", marginBottom: 1 }}>{k}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#222", fontFamily: "'SF Mono',monospace" }}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DistanceBars({ distances }) {
  const max = distances[distances.length - 1].dH || 180;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {distances.map((d, i) => (
        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 52, fontSize: 9, fontWeight: 700, color: FAMILY_COLOR[d.name], fontFamily: "'SF Mono',monospace", textAlign: "right" }}>{d.name}</div>
          <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 3, height: 10, position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${Math.max(4, ((180 - d.dH) / 180) * 100)}%`,
              background: FAMILY_COLOR[d.name],
              opacity: i === 0 ? 0.85 : 0.25, borderRadius: 3,
            }} />
          </div>
          <div style={{ width: 44, fontSize: 9, color: i === 0 ? FAMILY_COLOR[d.name] : "#bbb", fontFamily: "'SF Mono',monospace", fontWeight: i === 0 ? 700 : 400 }}>
            {i === 0 ? "← " : ""}{d.dH.toFixed(1)}°
          </div>
        </div>
      ))}
    </div>
  );
}

function AlgoCard({ name }) {
  const g = FAMILY_GUIDE[name];
  if (!g) return null;
  const color = FAMILY_COLOR[name];
  const driftColors = { Low: "#36d576", Medium: "#008cff", High: "#fa9950", Highest: "#ec5b5b" };
  return (
    <div style={{ background: "#fff", border: "1.5px solid #eee", borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: "#111" }}>{name} family</span>
        <span style={{
          marginLeft: "auto", fontSize: 8.5, fontWeight: 700,
          color: driftColors[g.driftLevel], background: driftColors[g.driftLevel] + "18",
          padding: "2px 7px", borderRadius: 4,
        }}>
          {g.driftLevel} drift
        </span>
      </div>

      <div style={{ fontSize: 9.5, color: "#777", marginBottom: 8, fontStyle: "italic" }}>{g.mechanism}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "#555" }}>
          <span style={{ fontWeight: 700, color: "#aaa", fontSize: 8.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Light steps · </span>
          {g.lightNote}
        </div>
        <div style={{ fontSize: 10, color: "#555" }}>
          <span style={{ fontWeight: 700, color: "#aaa", fontSize: 8.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Dark steps · </span>
          {g.darkNote}
        </div>
      </div>

      <div style={{ background: "#f8f9fa", borderRadius: 6, padding: "8px 10px", marginBottom: 6 }}>
        <div style={{ fontSize: 8.5, fontWeight: 700, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Algorithm</div>
        <div style={{ fontSize: 10, color: "#444", fontFamily: "'SF Mono',monospace" }}>{g.algoNote}</div>
      </div>

      <div style={{ fontSize: 9, color: "#aaa", fontFamily: "'SF Mono',monospace" }}>
        Steps: {g.extraSteps}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ColorSciencePage() {
  const driftStats = useDriftStats();
  const hueZones = useHueZones();
  const [classResult, setClassResult] = useState(null);

  const handleResult = useMemo(() => (r) => setClassResult(r), []);

  return (
    <div style={{ padding: "28px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#111", fontFamily: "'Libre Baskerville','Georgia',serif", letterSpacing: "-0.03em", lineHeight: 1 }}>
            Color Family Science
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#999", fontFamily: "'SF Mono',monospace" }}>
            Why hue angle determines the right generation strategy — and how to read any color's hidden info
          </p>
        </div>

        {/* ── Section 1: The Hidden Variable ── */}
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: "20px 24px", marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 14, fontFamily: "'SF Mono',monospace" }}>
            The Hidden Variable
          </div>

          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div style={{ flex: "2 1 340px" }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "#111" }}>
                OKLCH H° is your color's "zip code"
              </h2>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#555", lineHeight: 1.7 }}>
                When you pick any color, its OKLCH Hue angle (0–360°) tells you which of the six hue families it belongs to — and that family determines everything about how a swatch should be generated: how much the hue will drift, how to scale chroma at dark and light ends, and whether any hue correction is needed.
              </p>
              <p style={{ margin: "0 0 14px", fontSize: 11, color: "#555", lineHeight: 1.7 }}>
                This information is <strong>not visible to the naked eye</strong> when you look at a hex code. <code style={{ background: "#f4f4f4", padding: "1px 4px", borderRadius: 3, fontSize: 10 }}>#fad100</code> and <code style={{ background: "#f4f4f4", padding: "1px 4px", borderRadius: 3, fontSize: 10 }}>#008cff</code> are obviously different colors, but you cannot tell from their hex values that one needs a completely different algorithm to generate its scale correctly. Only OKLCH reveals that.
              </p>

              {/* Family H anchors */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {FAMILY_ANCHORS.map(a => (
                  <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 5, background: "#f8f9fa", borderRadius: 6, padding: "4px 8px" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: FAMILY_COLOR[a.name] }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#333", fontFamily: "'SF Mono',monospace" }}>
                      {a.name} H={a.H.toFixed(0)}°
                    </span>
                  </div>
                ))}
              </div>

              <HueBar anchors={FAMILY_ANCHORS} highlight={classResult?.nearest?.name} />
            </div>

            <div style={{ flex: "1 1 200px" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: "#111" }}>Two things OKLCH H tells you</h3>
              {[
                { n: "1", title: "Which family boundary you're in", body: "Each of the 6 family anchors claims a zone around its H°. The zone boundary is the midpoint between adjacent families. If H=70°, you're in Orange territory. H=88° is already Yellow." },
                { n: "2", title: "How far from the center you are", body: "Being 5° from the Red anchor is very different from being 5° from the Yellow anchor. Distance to the anchor predicts how well the standard algorithm will approximate that family's reference palette." },
              ].map(item => (
                <div key={item.n} style={{ marginBottom: 12, display: "flex", gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#7186A8", flexShrink: 0 }}>{item.n}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#222", marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 10, color: "#666", lineHeight: 1.6 }}>{item.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 2: Classifier ── */}
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: "20px 24px", marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 14, fontFamily: "'SF Mono',monospace" }}>
            Interactive Color Classifier
          </div>
          <p style={{ margin: "0 0 16px", fontSize: 11, color: "#777" }}>
            Paste any hex color below — or use the color picker — to instantly see its OKLCH coordinates, which family it belongs to, and what that means for palette generation.
          </p>

          <ClassifierInput onResult={handleResult} />

          {classResult && (
            <div style={{ marginTop: 20, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
              {/* Distance bars */}
              <div style={{ flex: "1 1 240px" }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'SF Mono',monospace" }}>
                  Distance to each family (smaller = closer)
                </div>
                <DistanceBars distances={classResult.distances} />
                <div style={{ marginTop: 10, padding: "8px 12px", background: classResult.nearest?.color + "15", borderRadius: 8, borderLeft: `3px solid ${FAMILY_COLOR[classResult.nearest?.name]}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#222", marginBottom: 2 }}>
                    Nearest family: <span style={{ color: FAMILY_COLOR[classResult.nearest?.name] }}>{classResult.nearest?.name}</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: "#666" }}>
                    ΔH = {classResult.distances[0].dH.toFixed(1)}° from {classResult.nearest?.name} anchor (H={classResult.nearest?.H.toFixed(0)}°)
                  </div>
                  {classResult.distances[0].dH > 20 && (
                    <div style={{ fontSize: 9, color: "#999", marginTop: 4 }}>
                      ⚠ {classResult.distances[0].dH.toFixed(0)}° from anchor — color is in the transition zone between {classResult.distances[0].name} and {classResult.distances[1].name}. Algorithm may show mixed-family behavior.
                    </div>
                  )}
                  {classResult.distances[0].dH <= 20 && (
                    <div style={{ fontSize: 9, color: "#999", marginTop: 4 }}>
                      ✓ Clearly within the {classResult.nearest?.name} family. {classResult.nearest?.name}-tuned algorithm will perform well.
                    </div>
                  )}
                </div>
              </div>

              {/* Algorithm card */}
              <div style={{ flex: "2 1 300px" }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'SF Mono',monospace" }}>
                  Algorithm guidance for this color
                </div>
                {classResult.nearest && <AlgoCard name={classResult.nearest.name} />}
              </div>
            </div>
          )}
        </div>

        {/* ── Section 3: Why the drift? ── */}
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: "20px 24px", marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 14, fontFamily: "'SF Mono',monospace" }}>
            Why Do Hues Drift Differently?
          </div>

          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 24 }}>
            <div style={{ flex: "1 1 300px" }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "#111" }}>The sRGB gamut is not a sphere</h2>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#555", lineHeight: 1.7 }}>
                In OKLCH space, the set of colors your screen can display (sRGB gamut) forms an <strong>irregular 3D blob</strong> — not a clean cylinder. The "wall" of the gamut sits at different chroma values for different hue angles, and that wall is not straight: it curves, bulges, and pinches differently at every H°.
              </p>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#555", lineHeight: 1.7 }}>
                When a palette algorithm tries to vary L while holding H and C fixed, it will eventually hit this wall. At that point, either the color goes out-of-gamut (clamped = hue distortion), or the algorithm must reduce C to stay inside (chroma collapse). <strong>Which hue angle you're at determines how soon you hit the wall and in which direction it pushes you.</strong>
              </p>
            </div>

            <div style={{ flex: "1 1 240px" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 800, color: "#111" }}>Two drift mechanisms</h3>
              {[
                {
                  title: "Gamut boundary distortion",
                  affects: "Yellow & Orange dark steps",
                  color: "#fa9950",
                  body: "The gamut wall forces a choice: reduce chroma OR shift hue. Yellow and orange hit this wall first — and hardest — because their peak-chroma point in OKLCH is near L=0.85–0.97 (near white). Anything darker requires sacrificing hue fidelity.",
                },
                {
                  title: "Low-chroma singularity",
                  affects: "All colors at light steps",
                  color: "#7186A8",
                  body: "As C → 0 (approaching white), the arc-tangent that computes H° becomes numerically unstable. A 1-unit change in one RGB channel can swing H by 15°. This affects light steps of EVERY family, but especially Blue, whose light steps have very low C.",
                },
              ].map(m => (
                <div key={m.title} style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "#f9fafb", borderLeft: `3px solid ${m.color}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#222", marginBottom: 3 }}>{m.title}</div>
                  <div style={{ fontSize: 9, color: m.color, fontWeight: 700, marginBottom: 5, fontFamily: "'SF Mono',monospace" }}>Affects: {m.affects}</div>
                  <div style={{ fontSize: 10, color: "#666", lineHeight: 1.6 }}>{m.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Actual drift chart from reference palettes */}
          <div style={{ fontSize: 9.5, fontWeight: 800, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontFamily: "'SF Mono',monospace" }}>
            Measured ΔH drift — computed from reference palettes (all steps vs. base-50)
          </div>
          <DriftBars stats={driftStats} />
          <p style={{ margin: "8px 0 0", fontSize: 9, color: "#bbb", fontFamily: "'SF Mono',monospace" }}>
            These are real measurements from the hardcoded reference hex values. Each bar = maximum observed ΔH across all steps in that family.
          </p>
        </div>

        {/* ── Section 4: Blue specifically ── */}
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 14, padding: "20px 24px", marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7186A8", marginBottom: 10, fontFamily: "'SF Mono',monospace" }}>
            Blue specifically — why medium, not low?
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 11, color: "#334155", lineHeight: 1.7 }}>
            You might expect Blue to be as stable as Red, Green, or Purple. It's not — and the reason is the specific shade <strong>#008cff</strong>, not blue in general.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              {
                n: "①",
                title: "Azure sits at the cyan-blue boundary",
                body: "#008cff has H≈252° — right at the edge between sky-blue/cyan territory and pure blue. The OKLCH gamut surface curves sharply here. Light steps naturally pull toward periwinkle (H drops); dark steps pull toward navy-indigo (H rises). A pure navy blue (#0000ff equivalent) would show much less drift because it's further from this boundary.",
              },
              {
                n: "②",
                title: "High chroma at base = low chroma at light steps",
                body: "Blue-50 is very saturated (C≈0.25). The light steps (05–30) must drop C dramatically to avoid neon blue. At C<0.03, the H computation enters the singularity zone described above — this is why light blues in any palette show the most H instability. Red and Green have the same issue but their starting C is lower, so the drop to \"singularity zone\" is less abrupt.",
              },
              {
                n: "③",
                title: "The palette intentionally adds step 55",
                body: "The reference blue palette has an extra step 55 (between base 50 and dark 60). This is a human correction for exactly this drift: the jump from vivid azure-blue (#008cff) to the darker #0263e0 was perceptually too large. Step 55 (#006dfa) bridges it. The drift at step 60 is precisely what motivated this addition.",
              },
            ].map(item => (
              <div key={item.n} style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#008cff", marginBottom: 4 }}>{item.n}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1e3a5f", marginBottom: 5 }}>{item.title}</div>
                <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.65 }}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 5: Per-family algorithm guide ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 16, fontFamily: "'SF Mono',monospace" }}>
            Per-family Algorithm Guide
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {FAMILY_ANCHORS.map(a => (
              <div key={a.name}>
                <div style={{ fontSize: 8.5, color: "#ccc", fontFamily: "'SF Mono',monospace", marginBottom: 4, paddingLeft: 4 }}>H = {a.H.toFixed(1)}°</div>
                <AlgoCard name={a.name} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 6: How to use this ── */}
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: "20px 24px", marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 14, fontFamily: "'SF Mono',monospace" }}>
            When you share a color — checklist
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { step: "1", title: "Compute OKLCH H", body: "Use the classifier above. This is your single most important number. H° classifies the color faster and more accurately than looking at the hex or the RGB components.", icon: "🔍" },
              { step: "2", title: "Identify the family", body: "Which of the 6 anchors is closest by ΔH? If ΔH < 15°, you're clearly in that family. If ΔH is 15–25°, you're near the boundary and will see mixed behavior.", icon: "🗂" },
              { step: "3", title: "Check the chroma C", body: "High C (>0.15) at mid-L means vivid color with a lot of gamut headroom. Low C (<0.08) means muted / neutral — these palettes will feel pastel at lighter steps.", icon: "⬤" },
              { step: "4", title: "Yellow/Orange? Expect dark-step deviation", body: "If H is between 40°–124°, your dark steps (70–100) will drift. This is correct and unavoidable. The reference palettes absorb this by using brown-gold tones at dark steps.", icon: "⚠" },
              { step: "5", title: "Blue? Expect light-step H noise", body: "If H is between 200°–270°, your light steps (05–30) will show H instability. The algorithm pins H to fight this, but some drift remains. Consider it a feature — it gives light blues a slightly \"airy\" feel.", icon: "~" },
              { step: "6", title: "Others: standard algorithm works", body: "Red, Green, Purple (and colors close to them) can use the standard OKLCH L interpolation + linear C reduction without corrections. The output will closely match the reference palette style.", icon: "✓" },
            ].map(item => (
              <div key={item.step} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #eee", background: "#fafafa" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{item.icon}</div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#111" }}>{item.title}</span>
                </div>
                <div style={{ fontSize: 10, color: "#666", lineHeight: 1.6 }}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 7: Why is the "why" hidden? ── */}
        <div style={{ background: "#f9fafb", borderRadius: 14, padding: "20px 24px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 12, fontFamily: "'SF Mono',monospace" }}>
            Why can't you see this from the hex?
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <p style={{ flex: "1 1 280px", margin: 0, fontSize: 11, color: "#555", lineHeight: 1.7 }}>
              A hex code like <code style={{ background: "#eee", padding: "1px 4px", borderRadius: 3, fontSize: 10 }}>#fa9950</code> encodes the intensities of three light sources (red, green, blue phosphors) rather than any perceptual property. The R, G, B channels have complex non-linear interactions: a small change in one channel can shift the perceived hue dramatically, or almost not at all, depending on the color.
            </p>
            <p style={{ flex: "1 1 280px", margin: 0, fontSize: 11, color: "#555", lineHeight: 1.7 }}>
              OKLCH was designed specifically to separate perceptual dimensions: L (how bright), C (how colorful), H (what color). Only H is meaningful for family classification. You can't estimate H reliably from hex without a full color-space conversion — which is exactly what the classifier does. This is why palette tools built on HSL or raw hex manipulation consistently produce worse results than those using OKLCH.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
