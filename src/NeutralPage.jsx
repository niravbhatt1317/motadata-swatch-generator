import { useMemo } from "react";
import { hexToRGB, rgbToOKLCH, getLuminance, wcagContrast, NEUTRAL_PALETTE } from "./colorData.js";

function useNeutralData() {
  return useMemo(() => NEUTRAL_PALETTE.map(({ step, hex, isText }) => {
    const { r, g, b } = hexToRGB(hex);
    const { L, C, H } = rgbToOKLCH(r, g, b);
    const lum = getLuminance(r, g, b);
    return { step, hex, r, g, b, L, C, H, isText,
      vsWhite: wcagContrast(lum, 1), vsBlack: wcagContrast(lum, 0) };
  }), []);
}

// ─── Mini chart ───────────────────────────────────────────────────────────────

function MiniChart({ data, metric, title, yMin, yMax, yFmt, width = 280, height = 150, zeroLine }) {
  const pad = { t: 20, r: 12, b: 32, l: 36 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const n = data.length;
  const sx = i => (i / (n - 1)) * iw;
  const sy = v => ih * (1 - (v - yMin) / (yMax - yMin));
  const ticks = Array.from({ length: 5 }, (_, i) => yMin + (yMax - yMin) * i / 4);
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(d[metric]).toFixed(1)}`).join("");

  return (
    <svg width={width} height={height} style={{ overflow: "visible", display: "block" }}>
      <text x={pad.l + iw / 2} y={13} textAnchor="middle" fontSize={10} fontWeight={700} fill="#555">{title}</text>
      <g transform={`translate(${pad.l},${pad.t})`}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={0} y1={sy(v)} x2={iw} y2={sy(v)} stroke="#f0f0f0" strokeWidth={1} />
            <text x={-4} y={sy(v) + 3.5} textAnchor="end" fontSize={7.5} fill="#ccc">{yFmt(v)}</text>
          </g>
        ))}
        {zeroLine != null && <line x1={0} y1={sy(zeroLine)} x2={iw} y2={sy(zeroLine)} stroke="#ccc" strokeWidth={1} strokeDasharray="3 2" />}
        <path d={path} fill="none" stroke="#7186A8" strokeWidth={1.5} opacity={0.3} />
        {data.map((d, i) => (
          <g key={d.step}>
            <circle cx={sx(i)} cy={sy(d[metric])} r={d.isText ? 5 : 4}
              fill={d.hex} stroke={d.isText ? "#333" : "white"} strokeWidth={d.isText ? 1.5 : 1} />
            {i % 3 === 0 && (
              <text x={sx(i)} y={ih + 18} textAnchor="middle" fontSize={7} fill="#ccc"
                transform={`rotate(-40,${sx(i)},${ih + 18})`}>{d.step}</text>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── Swatch grid ──────────────────────────────────────────────────────────────

function NeutralGrid({ data }) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 28, flexWrap: "wrap" }}>
      {data.map(d => {
        const useDark = d.L > 0.4;
        const tc = useDark ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.9)";
        const sc = useDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.5)";
        return (
          <div key={d.step} style={{
            background: d.hex, borderRadius: 10, padding: "10px 12px",
            width: 130, boxSizing: "border-box",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            position: "relative",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: tc, fontFamily: "'SF Mono',monospace" }}>
                gray-{d.step}
                {d.isText && <span style={{ fontSize: 8, marginLeft: 4, opacity: 0.7 }}>Text</span>}
              </span>
              <span style={{ fontSize: 9, color: sc, fontFamily: "'SF Mono',monospace" }}>{d.vsWhite}</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: tc, fontFamily: "'SF Mono',monospace", marginBottom: 2 }}>{d.hex}</div>
            <div style={{ fontSize: 9, color: sc, fontFamily: "'SF Mono',monospace" }}>L={d.L.toFixed(3)} C={d.C.toFixed(3)}</div>
            <div style={{ fontSize: 9, color: sc, fontFamily: "'SF Mono',monospace" }}>H={d.H.toFixed(1)}°</div>
            {d.isText && (
              <div style={{ position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: "50%", background: useDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Observations ─────────────────────────────────────────────────────────────

function ObsCard({ icon, title, body, accent }) {
  return (
    <div style={{ flex: "1 1 200px", background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: accent + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{icon}</div>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#111" }}>{title}</span>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: "#666", lineHeight: 1.65 }}>{body}</p>
    </div>
  );
}

// ─── Neutral Page ─────────────────────────────────────────────────────────────

export default function NeutralPage() {
  const data = useNeutralData();

  const hValues = data.map(d => d.H);
  const hMean = hValues.reduce((a, b) => a + b, 0) / hValues.length;
  const hRange = Math.max(...hValues) - Math.min(...hValues);
  const cValues = data.map(d => d.C);
  const cMean = cValues.reduce((a, b) => a + b, 0) / cValues.length;

  // Find the step gap (largest ΔL between consecutive steps)
  const gaps = data.slice(1).map((d, i) => ({
    from: data[i].step, to: d.step,
    dL: Math.abs(d.L - data[i].L)
  })).sort((a, b) => b.dL - a.dL);
  const biggestGap = gaps[0];

  return (
    <div style={{ padding: "28px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#111", fontFamily: "'Libre Baskerville','Georgia',serif", letterSpacing: "-0.03em", lineHeight: 1 }}>
            Neutral Palette
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#999", fontFamily: "'SF Mono',monospace" }}>
            16 steps · blue-tinted grays · H ≈ {hMean.toFixed(0)}° throughout · avg C = {cMean.toFixed(3)}
          </p>
        </div>

        {/* Swatch grid */}
        <NeutralGrid data={data} />

        {/* Charts */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 16, fontFamily: "'SF Mono',monospace" }}>
            OKLCH Pattern
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>

            <div>
              <MiniChart data={data} metric="L" title="Lightness (L)" yMin={0} yMax={1} yFmt={v => v.toFixed(1)} width={290} height={150} />
              <p style={{ margin: "4px 0 0 36px", fontSize: 9.5, color: "#bbb", fontFamily: "'SF Mono',monospace" }}>
                Linear ramp with {data.length} steps (0–100)
              </p>
            </div>

            <div>
              <MiniChart data={data} metric="C" title="Chroma (C) — the blue tint" yMin={0} yMax={0.1} yFmt={v => v.toFixed(3)} width={290} height={150} />
              <p style={{ margin: "4px 0 0 36px", fontSize: 9.5, color: "#bbb", fontFamily: "'SF Mono',monospace" }}>
                All &lt;0.07 — barely tinted, not quite pure gray
              </p>
            </div>

            <div>
              <MiniChart data={data} metric="H" title="Hue (H°) — locked at blue" yMin={220} yMax={270} yFmt={v => `${Math.round(v)}°`} width={290} height={150} zeroLine={hMean} />
              <p style={{ margin: "4px 0 0 36px", fontSize: 9.5, color: "#bbb", fontFamily: "'SF Mono',monospace" }}>
                Stays at H ≈ {hMean.toFixed(0)}° (blue). Drift = {hRange.toFixed(1)}° total
              </p>
            </div>

            {/* OKLCH table */}
            <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 10, padding: "12px 14px", alignSelf: "flex-start" }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'SF Mono',monospace" }}>All OKLCH values</div>
              <table style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["step", "L", "C", "H°"].map(h => (
                      <th key={h} style={{ fontSize: 8, color: "#bbb", fontWeight: 700, textAlign: "right", paddingBottom: 4, paddingLeft: 10, fontFamily: "'SF Mono',monospace" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map(d => (
                    <tr key={d.step}>
                      <td style={{ paddingRight: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 7, height: 7, borderRadius: 2, background: d.hex, flexShrink: 0 }} />
                          <span style={{ fontSize: 8, color: d.isText ? "#111" : "#999", fontWeight: d.isText ? 700 : 400, fontFamily: "'SF Mono',monospace" }}>
                            {d.step}{d.isText ? " ✦" : ""}
                          </span>
                        </div>
                      </td>
                      {[d.L.toFixed(3), d.C.toFixed(3), d.H.toFixed(1)].map((v, i) => (
                        <td key={i} style={{ fontSize: 8, textAlign: "right", paddingLeft: 10, fontFamily: "'SF Mono',monospace", color: "#555" }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ margin: "8px 0 0", fontSize: 8.5, color: "#aaa", fontFamily: "'SF Mono',monospace" }}>✦ = text step</p>
            </div>
          </div>
        </div>

        {/* Observations */}
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 14, fontFamily: "'SF Mono',monospace" }}>
          Pattern Observations
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          <ObsCard icon="🔵" title="Blue anchor" accent="#008cff"
            body={`All 16 steps lock H at ${hMean.toFixed(0)}° ± ${(hRange / 2).toFixed(1)}° — the same hue family as the Blue accent (H≈252°). The neutrals are "ultra-desaturated blues", not pure grays. This creates visual harmony when Blue accent colors appear alongside these neutrals.`}
          />
          <ObsCard icon="◎" title="Whisper chroma" accent="#7186A8"
            body={`Chroma stays between C=${Math.min(...cValues).toFixed(3)} and C=${Math.max(...cValues).toFixed(3)} — barely detectable to the naked eye but just enough to feel "alive" rather than cold/clinical. The tint peaks slightly in the midtones and fades at the extremes (near-white and near-black).`}
          />
          <ObsCard icon="↕" title={`Large gap: gray-30 → gray-40`} accent="#CAD3E2"
            body={`The biggest perceptual jump in the scale (ΔL = ${biggestGap.dL.toFixed(3)}) is between gray-${biggestGap.from} and gray-${biggestGap.to}. This is intentional: steps 05–30 are background/surface colors, while 40+ are interactive UI element colors. The gap creates a natural semantic boundary.`}
          />
          <ObsCard icon="✦" title="Two text anchors" accent="#516381"
            body={`gray-75 is the AA text minimum (contrast ≥4.5:1 on white). gray-93 is the AAA/body-text standard (contrast ≥7:1 on white). The dense 90–96 range (6 steps in 6 units) gives fine-grained control for heading/body/caption hierarchy in dark or high-contrast UI.`}
          />
        </div>

        {/* Step structure */}
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 12, fontFamily: "'SF Mono',monospace" }}>
            Semantic step groups
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "Backgrounds & surfaces", steps: ["05","10","20","30"], desc: "Page bg, card bg, subtle tints", color: "#F6F9FC" },
              { label: "UI elements & borders", steps: ["40","50","60","70"], desc: "Borders, dividers, disabled states, placeholders", color: "#7186A8" },
              { label: "Text & dark UI", steps: ["75","80","90","92","93","94","95","96"], desc: "Icons, text, dark modes. 75/93 are AA/AAA minimums", color: "#243147" },
            ].map(g => (
              <div key={g.label} style={{ flex: "1 1 200px", borderRadius: 8, padding: "10px 14px", border: "1px solid #eee" }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {g.steps.map(s => {
                    const d = data.find(x => x.step === s);
                    return d ? <div key={s} style={{ width: 16, height: 16, borderRadius: 3, background: d.hex, border: "1px solid rgba(0,0,0,0.08)" }} title={`gray-${s}`} /> : null;
                  })}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#222", marginBottom: 3 }}>{g.label}</div>
                <div style={{ fontSize: 10, color: "#888" }}>{g.desc}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
