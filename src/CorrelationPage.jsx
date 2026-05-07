import { useMemo } from "react";
import {
  hexToRGB, rgbToOKLCH, getLuminance, wcagContrast,
  NEUTRAL_PALETTE, REFERENCE_PALETTES, PRESETS
} from "./colorData.js";

// ─── Data helpers ─────────────────────────────────────────────────────────────

function useCorrelationData() {
  return useMemo(() => {
    const neutrals = NEUTRAL_PALETTE.map(({ step, hex, isText }) => {
      const { r, g, b } = hexToRGB(hex);
      const oklch = rgbToOKLCH(r, g, b);
      const lum = getLuminance(r, g, b);
      return { step, hex, r, g, b, ...oklch, lum, isText,
        vsWhite: wcagContrast(lum, 1), vsBlack: wcagContrast(lum, 0) };
    });

    const families = PRESETS.map(({ name, color }) => {
      const ref = REFERENCE_PALETTES[color.toLowerCase()];
      const swatches = ref ? ref.swatches.map(({ step, hex }) => {
        const { r, g, b } = hexToRGB(hex);
        const oklch = rgbToOKLCH(r, g, b);
        const lum = getLuminance(r, g, b);
        return { step, hex, r, g, b, ...oklch, lum,
          vsWhite: wcagContrast(lum, 1), vsBlack: wcagContrast(lum, 0) };
      }) : [];

      const base = swatches.find(s => s.step === "50") || swatches[0];
      return { name, color, swatches, baseH: base?.H ?? 0, baseC: base?.C ?? 0, baseL: base?.L ?? 0 };
    });

    // Neutral mean hue
    const neutralHValues = neutrals.map(n => n.H);
    const neutralHMean = neutralHValues.reduce((a, b) => a + b, 0) / neutralHValues.length;

    // hue distance from neutral
    const familiesWithDeltaH = families.map(f => {
      let dH = f.baseH - neutralHMean;
      if (dH > 180) dH -= 360;
      if (dH < -180) dH += 360;
      return { ...f, dH: Math.abs(dH), dHRaw: dH };
    });

    return { neutrals, families: familiesWithDeltaH, neutralHMean };
  }, []);
}

// ─── Hue Wheel ────────────────────────────────────────────────────────────────

const FAMILY_COLORS = {
  Red: "#ec5b5b", Orange: "#fa9950", Yellow: "#fad100",
  Green: "#36d576", Blue: "#008cff", Purple: "#8c5bd8",
};

function polarToXY(angleDeg, r) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
}

function HueWheel({ families, neutralHMean, size = 280 }) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 20;
  const innerR = outerR - 18;
  const labelR = outerR + 10;

  // Draw a gradient arc ring as background hint
  const segments = 360;
  const arcPaths = Array.from({ length: segments }, (_, i) => {
    const a1 = i - 90;
    const a2 = i + 1 - 90;
    const r1 = (a1) * Math.PI / 180;
    const r2 = (a2) * Math.PI / 180;
    const x1o = cx + outerR * Math.cos(r1), y1o = cy + outerR * Math.sin(r1);
    const x2o = cx + outerR * Math.cos(r2), y2o = cy + outerR * Math.sin(r2);
    const x1i = cx + innerR * Math.cos(r1), y1i = cy + innerR * Math.sin(r1);
    const x2i = cx + innerR * Math.cos(r2), y2i = cy + innerR * Math.sin(r2);
    return { path: `M${x1i},${y1i} L${x1o},${y1o} L${x2o},${y2o} L${x2i},${y2i}Z`, hue: i };
  });

  const neutralPt = polarToXY(neutralHMean, outerR + 28);
  const neutralLine = polarToXY(neutralHMean, outerR);

  return (
    <svg width={size + 80} height={size + 40} style={{ display: "block" }}>
      <g transform={`translate(40,20)`}>
        {/* Arc ring */}
        {arcPaths.map(({ path, hue }) => (
          <path key={hue} d={path} fill={`oklch(0.65 0.15 ${hue})`} opacity={0.35} />
        ))}

        {/* Neutral spoke */}
        <line
          x1={cx} y1={cy}
          x2={cx + outerR * Math.cos((neutralHMean - 90) * Math.PI / 180)}
          y2={cy + outerR * Math.sin((neutralHMean - 90) * Math.PI / 180)}
          stroke="#7186A8" strokeWidth={2} strokeDasharray="4 3" opacity={0.6}
        />

        {/* Accent spokes */}
        {families.map(f => {
          const pt = polarToXY(f.baseH, outerR);
          const inner = polarToXY(f.baseH, innerR - 6);
          return (
            <line key={f.name} x1={cx} y1={cy} x2={cx + pt.x} y2={cy + pt.y}
              stroke={FAMILY_COLORS[f.name]} strokeWidth={1.5} opacity={0.4} />
          );
        })}

        {/* Center dot (neutral) */}
        <circle cx={cx} cy={cy} r={7} fill="#7186A8" opacity={0.9} />
        <text x={cx} y={cy - 11} textAnchor="middle" fontSize={8} fill="#7186A8" fontWeight={700}>Neutral</text>

        {/* Accent dots on ring */}
        {families.map(f => {
          const pt = polarToXY(f.baseH, outerR - 4);
          return (
            <circle key={f.name} cx={cx + pt.x} cy={cy + pt.y} r={7}
              fill={FAMILY_COLORS[f.name]} stroke="white" strokeWidth={1.5} />
          );
        })}

        {/* Labels outside ring */}
        {families.map(f => {
          const pt = polarToXY(f.baseH, outerR + 20);
          const anchor = f.baseH > 180 ? "end" : f.baseH < 5 ? "middle" : "start";
          return (
            <text key={f.name} x={cx + pt.x} y={cy + pt.y + 3.5}
              textAnchor="middle" fontSize={8} fontWeight={700} fill={FAMILY_COLORS[f.name]}>
              {f.name}
            </text>
          );
        })}

        {/* Neutral label */}
        <text x={cx + neutralPt.x} y={cy + neutralPt.y}
          textAnchor="middle" fontSize={7.5} fill="#516381" fontWeight={600}>H≈{neutralHMean.toFixed(0)}°</text>

        {/* H tick labels at cardinal angles */}
        {[0, 90, 180, 270].map(deg => {
          const pt = polarToXY(deg, outerR + 34);
          return (
            <text key={deg} x={cx + pt.x} y={cy + pt.y + 3.5}
              textAnchor="middle" fontSize={7} fill="#ccc">{deg}°</text>
          );
        })}
      </g>
    </svg>
  );
}

// ─── H distance table ─────────────────────────────────────────────────────────

function HueDistanceTable({ families, neutralHMean }) {
  const sorted = [...families].sort((a, b) => a.dH - b.dH);
  return (
    <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'SF Mono',monospace" }}>
        Hue distance from neutral (H≈{neutralHMean.toFixed(0)}°)
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {["Family", "Base H°", "|ΔH|", "Relationship"].map(h => (
              <th key={h} style={{ fontSize: 8, color: "#bbb", fontWeight: 700, textAlign: "left", paddingBottom: 4, paddingRight: 10, fontFamily: "'SF Mono',monospace" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(f => {
            const rel = f.dH < 20 ? "Analogous" : f.dH < 60 ? "Near" : f.dH < 120 ? "Split" : f.dH < 160 ? "Triadic" : "Complementary";
            const relColor = f.dH < 20 ? "#008cff" : f.dH < 60 ? "#36d576" : f.dH < 120 ? "#fa9950" : "#ec5b5b";
            return (
              <tr key={f.name}>
                <td style={{ paddingRight: 10, paddingBottom: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: FAMILY_COLORS[f.name] }} />
                    <span style={{ fontSize: 8.5, color: "#333", fontFamily: "'SF Mono',monospace" }}>{f.name}</span>
                  </div>
                </td>
                <td style={{ fontSize: 8.5, color: "#555", fontFamily: "'SF Mono',monospace", paddingRight: 10 }}>{f.baseH.toFixed(1)}°</td>
                <td style={{ fontSize: 8.5, fontWeight: 700, color: FAMILY_COLORS[f.name], fontFamily: "'SF Mono',monospace", paddingRight: 10 }}>{f.dH.toFixed(1)}°</td>
                <td style={{ fontSize: 8, color: relColor, fontFamily: "'SF Mono',monospace" }}>{rel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── L curve overlay ──────────────────────────────────────────────────────────

function LCurveOverlay({ families, neutrals, width = 320, height = 170 }) {
  const pad = { t: 20, r: 12, b: 32, l: 36 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const sy = v => ih * (1 - v);

  // Neutral L values at their positions 0..1
  const nPoints = neutrals.map((n, i) => ({ x: (i / (neutrals.length - 1)) * iw, y: sy(n.L) }));
  const nPath = nPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg width={width} height={height} style={{ overflow: "visible", display: "block" }}>
      <text x={pad.l + iw / 2} y={13} textAnchor="middle" fontSize={10} fontWeight={700} fill="#555">
        L-curve comparison: Neutral vs. Accents
      </text>
      <g transform={`translate(${pad.l},${pad.t})`}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={0} y1={sy(v)} x2={iw} y2={sy(v)} stroke="#f0f0f0" strokeWidth={1} />
            <text x={-4} y={sy(v) + 3.5} textAnchor="end" fontSize={7.5} fill="#ccc">{v.toFixed(2)}</text>
          </g>
        ))}

        {/* Accent L curves */}
        {families.map(f => {
          const pts = f.swatches.map((s, i) => ({
            x: (i / (f.swatches.length - 1)) * iw,
            y: sy(s.L)
          }));
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
          return <path key={f.name} d={d} fill="none" stroke={FAMILY_COLORS[f.name]} strokeWidth={1.2} opacity={0.35} />;
        })}

        {/* Neutral L curve (bold) */}
        <path d={nPath} fill="none" stroke="#7186A8" strokeWidth={2} opacity={0.85} />

        {/* Legend */}
        <text x={iw - 2} y={sy(neutrals[neutrals.length - 1].L) - 5} textAnchor="end" fontSize={7.5} fill="#7186A8" fontWeight={700}>Neutral</text>
      </g>
    </svg>
  );
}

// ─── Contrast pairing matrix ──────────────────────────────────────────────────

const BG_STEPS = ["05", "10", "20", "30"];
const FG_STEPS = ["75", "80", "90", "93", "95", "96"];
const ACCENT_BASE_STEPS = ["40", "50", "60", "70"];

function ContrastCell({ ratio, target }) {
  const pass = ratio >= target;
  const aaPass = ratio >= 4.5;
  const aaaPass = ratio >= 7;
  const bg = aaaPass ? "#f0fdf4" : aaPass ? "#fffbeb" : "#fef2f2";
  const tc = aaaPass ? "#166534" : aaPass ? "#92400e" : "#991b1b";
  return (
    <td style={{ padding: "3px 6px", textAlign: "center", background: bg, borderRadius: 3, fontSize: 7.5, fontFamily: "'SF Mono',monospace", color: tc, fontWeight: 700 }}>
      {ratio.toFixed(1)}
    </td>
  );
}

function ContrastMatrix({ neutrals, families }) {
  const bgNeutrals = BG_STEPS.map(s => neutrals.find(n => n.step === s)).filter(Boolean);
  const fgNeutrals = FG_STEPS.map(s => neutrals.find(n => n.step === s)).filter(Boolean);

  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 800, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'SF Mono',monospace" }}>
        Contrast matrix: Neutral BG × Accent FG
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: "2px" }}>
          <thead>
            <tr>
              <th style={{ fontSize: 7.5, color: "#bbb", fontWeight: 700, textAlign: "left", paddingRight: 8, fontFamily: "'SF Mono',monospace" }}>BG ↓ / FG →</th>
              {families.map(f => (
                <th key={f.name} colSpan={ACCENT_BASE_STEPS.length} style={{ fontSize: 8, fontWeight: 700, color: FAMILY_COLORS[f.name], paddingBottom: 4, textAlign: "center", fontFamily: "'SF Mono',monospace" }}>
                  {f.name}
                </th>
              ))}
            </tr>
            <tr>
              <th />
              {families.map(f =>
                ACCENT_BASE_STEPS.map(s => (
                  <th key={f.name + s} style={{ fontSize: 7, color: "#bbb", fontWeight: 600, textAlign: "center", paddingBottom: 3, fontFamily: "'SF Mono',monospace" }}>
                    {s}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {bgNeutrals.map(bg => (
              <tr key={bg.step}>
                <td style={{ paddingRight: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: bg.hex, border: "1px solid rgba(0,0,0,0.1)" }} />
                    <span style={{ fontSize: 7.5, color: "#555", fontFamily: "'SF Mono',monospace" }}>gray-{bg.step}</span>
                  </div>
                </td>
                {families.map(f =>
                  ACCENT_BASE_STEPS.map(s => {
                    const swatch = f.swatches.find(sw => sw.step === s);
                    if (!swatch) return <td key={f.name + s} />;
                    const ratio = wcagContrast(bg.lum, swatch.lum);
                    return <ContrastCell key={f.name + s} ratio={ratio} target={4.5} />;
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: "6px 0 0", fontSize: 8, color: "#bbb", fontFamily: "'SF Mono',monospace" }}>
          Green ≥7:1 (AAA) · Yellow ≥4.5:1 (AA) · Red &lt;4.5:1 (fail)
        </p>
      </div>

      {/* Text fg on bg */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 9.5, fontWeight: 800, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'SF Mono',monospace" }}>
          Contrast matrix: Neutral FG × Neutral BG (text readability)
        </div>
        <table style={{ borderCollapse: "separate", borderSpacing: "2px" }}>
          <thead>
            <tr>
              <th style={{ fontSize: 7.5, color: "#bbb", fontWeight: 700, textAlign: "left", paddingRight: 8, fontFamily: "'SF Mono',monospace" }}>Text ↓ / BG →</th>
              {bgNeutrals.map(bg => (
                <th key={bg.step} style={{ padding: "0 4px 4px", textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: bg.hex, border: "1px solid rgba(0,0,0,0.1)" }} />
                    <span style={{ fontSize: 7, color: "#aaa", fontFamily: "'SF Mono',monospace" }}>{bg.step}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fgNeutrals.map(fg => (
              <tr key={fg.step}>
                <td style={{ paddingRight: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: fg.hex, border: "1px solid rgba(0,0,0,0.1)" }} />
                    <span style={{ fontSize: 7.5, color: "#555", fontFamily: "'SF Mono',monospace" }}>gray-{fg.step}{fg.isText ? " ✦" : ""}</span>
                  </div>
                </td>
                {bgNeutrals.map(bg => {
                  const ratio = wcagContrast(bg.lum, fg.lum);
                  return <ContrastCell key={bg.step} ratio={ratio} target={4.5} />;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: "6px 0 0", fontSize: 8, color: "#bbb", fontFamily: "'SF Mono',monospace" }}>✦ = text anchor step</p>
      </div>
    </div>
  );
}

// ─── Key insight card ─────────────────────────────────────────────────────────

function InsightCard({ icon, title, body, accent = "#7186A8" }) {
  return (
    <div style={{ flex: "1 1 220px", background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: accent + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{icon}</div>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#111" }}>{title}</span>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: "#666", lineHeight: 1.65 }}>{body}</p>
    </div>
  );
}

// ─── Recommended pairings section ────────────────────────────────────────────

function PairingShowcase({ families, neutrals }) {
  const bg05 = neutrals.find(n => n.step === "05");
  const bg10 = neutrals.find(n => n.step === "10");
  const text93 = neutrals.find(n => n.step === "93");
  const text75 = neutrals.find(n => n.step === "75");

  const pairs = families.map(f => {
    const fg50 = f.swatches.find(s => s.step === "50");
    const fg60 = f.swatches.find(s => s.step === "60");
    const on05 = fg50 ? wcagContrast(bg05?.lum ?? 1, fg50.lum) : null;
    const on10 = fg50 ? wcagContrast(bg10?.lum ?? 1, fg50.lum) : null;
    const bestFg = on05 >= on10 ? fg50 : (fg60 ?? fg50);
    const bestBg = on05 >= on10 ? bg05 : bg10;
    const ratio = bestFg && bestBg ? wcagContrast(bestBg.lum, bestFg.lum) : 0;
    return { ...f, bestFg, bestBg, ratio };
  });

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 14, fontFamily: "'SF Mono',monospace" }}>
        Recommended Neutral + Accent Pairings
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {pairs.map(p => {
          const aaPass = p.ratio >= 4.5;
          return (
            <div key={p.name} style={{
              flex: "1 1 120px", borderRadius: 12, overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.06)"
            }}>
              {/* Color preview */}
              <div style={{ background: p.bestBg?.hex ?? "#fff", padding: "14px 14px 10px" }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: p.bestFg?.hex ?? "#000", fontFamily: "system-ui", marginBottom: 2 }}>Aa</div>
                <div style={{ fontSize: 8.5, color: p.bestFg?.hex ?? "#000", opacity: 0.8, fontFamily: "'SF Mono',monospace" }}>{p.name}</div>
              </div>
              {/* Info */}
              <div style={{ padding: "8px 10px", background: "#fff" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#333", marginBottom: 2, fontFamily: "'SF Mono',monospace" }}>{p.name}</div>
                <div style={{ fontSize: 8, color: "#888", fontFamily: "'SF Mono',monospace", marginBottom: 1 }}>
                  gray-{p.bestBg?.step} bg
                </div>
                <div style={{ fontSize: 8, color: "#888", fontFamily: "'SF Mono',monospace", marginBottom: 4 }}>
                  {p.name.toLowerCase()}-{p.bestFg?.step} fg
                </div>
                <div style={{
                  display: "inline-block", padding: "1px 5px", borderRadius: 3, fontSize: 7.5, fontWeight: 700,
                  background: aaPass ? "#f0fdf4" : "#fef2f2",
                  color: aaPass ? "#166534" : "#991b1b",
                  fontFamily: "'SF Mono',monospace"
                }}>
                  {p.ratio.toFixed(1)}:1 {aaPass ? "AA" : "fail"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chroma comparison chart ──────────────────────────────────────────────────

function ChromaCompare({ families, neutrals, width = 320, height = 170 }) {
  const pad = { t: 20, r: 12, b: 32, l: 36 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const yMax = 0.22;
  const sy = v => ih * (1 - v / yMax);
  const nPts = neutrals.map((n, i) => ({ x: (i / (neutrals.length - 1)) * iw, y: sy(n.C) }));
  const nPath = nPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
  const ticks = [0, 0.05, 0.10, 0.15, 0.20];

  return (
    <svg width={width} height={height} style={{ overflow: "visible", display: "block" }}>
      <text x={pad.l + iw / 2} y={13} textAnchor="middle" fontSize={10} fontWeight={700} fill="#555">
        Chroma (C) comparison: Neutral vs. Accents
      </text>
      <g transform={`translate(${pad.l},${pad.t})`}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={0} y1={sy(v)} x2={iw} y2={sy(v)} stroke="#f0f0f0" strokeWidth={1} />
            <text x={-4} y={sy(v) + 3.5} textAnchor="end" fontSize={7.5} fill="#ccc">{v.toFixed(2)}</text>
          </g>
        ))}
        {families.map(f => {
          const pts = f.swatches.map((s, i) => ({ x: (i / (f.swatches.length - 1)) * iw, y: sy(Math.min(s.C ?? 0, yMax)) }));
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
          return <path key={f.name} d={d} fill="none" stroke={FAMILY_COLORS[f.name]} strokeWidth={1.2} opacity={0.35} />;
        })}
        <path d={nPath} fill="none" stroke="#7186A8" strokeWidth={2} opacity={0.85} />
        <text x={iw - 2} y={nPts[nPts.length - 1].y - 5} textAnchor="end" fontSize={7.5} fill="#7186A8" fontWeight={700}>Neutral</text>
      </g>
    </svg>
  );
}

// ─── Correlation Page ─────────────────────────────────────────────────────────

export default function CorrelationPage() {
  const { neutrals, families, neutralHMean } = useCorrelationData();
  const blueFamily = families.find(f => f.name === "Blue");

  return (
    <div style={{ padding: "28px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#111", fontFamily: "'Libre Baskerville','Georgia',serif", letterSpacing: "-0.03em", lineHeight: 1 }}>
            Neutral × Accent Correlation
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#999", fontFamily: "'SF Mono',monospace" }}>
            How the blue-tinted neutral scale relates to all 6 accent families
          </p>
        </div>

        {/* Hue wheel + table */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 32, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 12, fontFamily: "'SF Mono',monospace" }}>
              Hue Wheel
            </div>
            <HueWheel families={families} neutralHMean={neutralHMean} size={260} />
            <p style={{ margin: "4px 0 0 20px", fontSize: 9.5, color: "#bbb", fontFamily: "'SF Mono',monospace" }}>
              Neutral (center) vs. accent base-50 hues
            </p>
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 12, fontFamily: "'SF Mono',monospace" }}>
              Hue Distance Table
            </div>
            <HueDistanceTable families={families} neutralHMean={neutralHMean} />
          </div>
        </div>

        {/* L + C curve overlays */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 16, fontFamily: "'SF Mono',monospace" }}>
            OKLCH Curve Overlays
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <LCurveOverlay families={families} neutrals={neutrals} width={320} height={170} />
              <p style={{ margin: "4px 0 0 36px", fontSize: 9.5, color: "#bbb", fontFamily: "'SF Mono',monospace" }}>
                Neutral (bold blue) vs. all accents — similar L range but more steps
              </p>
            </div>
            <div>
              <ChromaCompare families={families} neutrals={neutrals} width={320} height={170} />
              <p style={{ margin: "4px 0 0 36px", fontSize: 9.5, color: "#bbb", fontFamily: "'SF Mono',monospace" }}>
                Neutral C stays &lt;0.07 — almost invisible next to accent chroma (0.1–0.2)
              </p>
            </div>
          </div>
        </div>

        {/* Contrast matrix */}
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "16px 20px", marginBottom: 32 }}>
          <ContrastMatrix neutrals={neutrals} families={families} />
        </div>

        {/* Pairing showcase */}
        <div style={{ marginBottom: 32 }}>
          <PairingShowcase families={families} neutrals={neutrals} />
        </div>

        {/* Key insights */}
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 14, fontFamily: "'SF Mono',monospace" }}>
          Key Correlations
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          <InsightCard icon="🔵" title="Neutral is analogous to Blue" accent="#008cff"
            body={`Neutral H≈${neutralHMean.toFixed(0)}° sits only ${blueFamily ? blueFamily.dH.toFixed(1) : "~8"}° from Blue (H≈252°). In color theory, analogous colors (ΔH<30°) create harmony without tension. The neutral scale was deliberately built to be a "de-saturated sibling" of the Blue accent — so any Blue UI element placed on a neutral background immediately feels at home.`}
          />
          <InsightCard icon="⚖️" title="Complementary contrast with Red & Green" accent="#ec5b5b"
            body={`Red (H≈25°) and Green (H≈155°) sit 200°+ from the neutral's blue anchor. This is near-complementary territory — the highest visual tension. Red and Green accent elements on neutral backgrounds will always "pop." This makes them ideal for error states (Red) and success states (Green) where you want maximum attention.`}
          />
          <InsightCard icon="🌗" title="Yellow fails on light neutrals" accent="#fad100"
            body={`Yellow (H≈93°) has extremely high L at step 50 (~0.90). On gray-05 through gray-20 (L>0.90 too), contrast ratios collapse below 1.5:1 — completely invisible. Yellow always needs a dark neutral background (gray-90+) or a darker yellow step (70-80) to hit AA. This is the most accessibility-constrained pairing in the system.`}
          />
          <InsightCard icon="🎯" title="Orange & Purple: symmetric distance" accent="#fa9950"
            body={`Orange (ΔH≈140°) and Purple (ΔH≈95°) are roughly equidistant from the neutral's blue anchor, forming a near-symmetric split-complementary triad around blue. This means Orange and Purple have similar contrast behavior on neutral surfaces — both will be clearly visible on light neutrals at step 50-60 and above.`}
          />
          <InsightCard icon="✦" title="Gray-75 and Gray-93 anchor the text system" accent="#516381"
            body={`Gray-75 (#516381) achieves ≥4.5:1 (AA) on white. Gray-93 (#1D2A3E) achieves ≥7:1 (AAA). When accent colors are used as bg tints (e.g. blue-05, red-05), text in gray-93 maintains accessibility because the tint L is still >0.95. This means the neutral text scale works universally across all accent background tints.`}
          />
        </div>

        {/* Design principles */}
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 16, fontFamily: "'SF Mono',monospace" }}>
            Design System Rules (derived from patterns)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {[
              { rule: "Blue on neutral = home base", detail: "No extra work needed. ΔH≈8° means seamless harmony at any luminance level." },
              { rule: "Red/Green = signal colors", detail: "Complementary tension ensures these always read as deliberate, high-attention elements." },
              { rule: "Yellow = dark-mode only (light bg)", detail: "Yellow-50 fails WCAG on all gray-05–30 backgrounds. Use yellow-70+ or dark neutral backgrounds." },
              { rule: "Any accent-05 tint is neutral-compatible", detail: "All accent-05 swatches have L>0.97, so gray-93 text (L≈0.18) achieves 7:1+ contrast." },
              { rule: "Gray-75 is the universal min text", detail: "Works on white, accent-05, and accent-10 backgrounds across all 6 families." },
              { rule: "Neutral chroma creates invisible glue", detail: "C<0.07 means neutral surfaces look 'warm' next to high-chroma accents but 'cool' alone — adaptive context." },
            ].map(item => (
              <div key={item.rule} style={{ borderLeft: "3px solid #e8ecf2", paddingLeft: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#222", marginBottom: 3 }}>{item.rule}</div>
                <div style={{ fontSize: 10, color: "#777", lineHeight: 1.55 }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
