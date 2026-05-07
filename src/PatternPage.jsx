import { useMemo } from "react";
import { hexToRGB, rgbToOKLCH, REFERENCE_PALETTES, PRESETS } from "./colorData.js";

const FAMILY_COLORS = {
  Red: "#ec5b5b", Orange: "#fa9950", Yellow: "#d4a000",
  Green: "#36d576", Blue: "#008cff", Purple: "#8c5bd8",
};

function useFamilyData() {
  return useMemo(() => {
    return PRESETS.map(preset => {
      const ref = REFERENCE_PALETTES[preset.color];
      if (!ref) return null;
      const raw = ref.swatches.map(({ step, hex }) => {
        const { r, g, b } = hexToRGB(hex);
        const { L, C, H } = rgbToOKLCH(r, g, b);
        return { step, hex, L, C, H };
      });
      const base = raw.find(s => s.step === ref.baseStep) || raw[5];
      const baseH = base.H;
      // dH = hue deviation from base, normalized to [-180, +180]
      const swatches = raw.map(s => {
        let dH = s.H - baseH;
        if (dH > 180) dH -= 360;
        if (dH < -180) dH += 360;
        return { ...s, dH };
      });
      const hRange = Math.max(...swatches.map(s => Math.abs(s.dH)));
      return {
        name: preset.name,
        color: FAMILY_COLORS[preset.name] || preset.color,
        swatches,
        baseH,
        hRange,
        peakC: Math.max(...swatches.map(s => s.C)),
        stepCount: swatches.length,
        lMin: Math.min(...swatches.map(s => s.L)),
        lMax: Math.max(...swatches.map(s => s.L)),
      };
    }).filter(Boolean);
  }, []);
}

// ─── SVG Chart ────────────────────────────────────────────────────────────────

function Chart({ title, subtitle, width = 230, height = 145, yMin, yMax, yFmt, zeroLine, children }) {
  const pad = { t: 22, r: 8, b: 30, l: 36 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const sy = v => ih * (1 - (v - yMin) / (yMax - yMin));
  const ticks = Array.from({ length: 5 }, (_, i) => yMin + (yMax - yMin) * i / 4);

  return (
    <div>
      <svg width={width} height={height} style={{ overflow: "visible", display: "block" }}>
        <text x={pad.l + iw / 2} y={13} textAnchor="middle" fontSize={10} fontWeight={700} fill="#555">{title}</text>
        <g transform={`translate(${pad.l},${pad.t})`}>
          {ticks.map(v => (
            <g key={v}>
              <line x1={0} y1={sy(v)} x2={iw} y2={sy(v)} stroke="#efefef" strokeWidth={1} />
              <text x={-4} y={sy(v) + 3.5} textAnchor="end" fontSize={7.5} fill="#ccc">{yFmt(v)}</text>
            </g>
          ))}
          {zeroLine != null && (
            <line x1={0} y1={sy(zeroLine)} x2={iw} y2={sy(zeroLine)} stroke="#ccc" strokeWidth={1} strokeDasharray="3 2" />
          )}
          {children({ iw, ih, sy })}
        </g>
      </svg>
      {subtitle && (
        <p style={{ margin: "3px 0 0 36px", fontSize: 9, color: "#bbb", fontFamily: "'SF Mono',monospace", maxWidth: width - 36 }}>{subtitle}</p>
      )}
    </div>
  );
}

function SeriesLine({ swatches, metric, iw, sy, color, dotColor }) {
  const n = swatches.length;
  const sx = i => (i / (n - 1)) * iw;
  const path = swatches.map((s, i) =>
    `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(s[metric]).toFixed(1)}`
  ).join("");
  return (
    <g>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} opacity={0.3} />
      {swatches.map((s, i) => (
        <g key={s.step}>
          <circle cx={sx(i)} cy={sy(s[metric])} r={4} fill={dotColor ? s.hex : color} stroke="white" strokeWidth={1} />
          {i % 3 === 0 && (
            <text x={sx(i)} y={112} textAnchor="middle" fontSize={7} fill="#ccc"
              transform={`rotate(-40,${sx(i)},112)`}>{s.step}</text>
          )}
        </g>
      ))}
    </g>
  );
}

// ─── Swatch Strip ─────────────────────────────────────────────────────────────

function SwatchStrip({ swatches, name }) {
  return (
    <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
      {swatches.map(s => (
        <div key={s.step}
          title={`${name}-${s.step}: ${s.hex}\nL=${s.L.toFixed(3)}  C=${s.C.toFixed(3)}  H=${s.H.toFixed(1)}°  ΔH=${s.dH > 0 ? "+" : ""}${s.dH.toFixed(1)}°`}
          style={{ flex: 1, height: 36, background: s.hex, borderRadius: 5, minWidth: 0 }} />
      ))}
    </div>
  );
}

// ─── Per-Family Section ───────────────────────────────────────────────────────

function FamilySection({ family }) {
  const { name, color, swatches, baseH, hRange, peakC, stepCount } = family;
  const hShifted = hRange > 8;

  return (
    <div style={{ marginBottom: 40, paddingBottom: 36, borderBottom: "1px solid #efefef" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: "#111", fontFamily: "'Libre Baskerville',serif" }}>{name}</span>
        <span style={{ fontSize: 11, color: "#aaa", fontFamily: "'SF Mono',monospace" }}>H anchor = {baseH.toFixed(0)}°</span>
        <span style={{ color: "#ddd" }}>·</span>
        <span style={{ fontSize: 11, color: "#aaa", fontFamily: "'SF Mono',monospace" }}>peak C = {peakC.toFixed(3)}</span>
        <span style={{ color: "#ddd" }}>·</span>
        <span style={{ fontSize: 11, color: "#aaa", fontFamily: "'SF Mono',monospace" }}>{stepCount} steps</span>
        {hShifted && (
          <span style={{ fontSize: 10, background: "#fff8e1", color: "#b45309", border: "1px solid #fde68a", borderRadius: 5, padding: "2px 7px", fontFamily: "'SF Mono',monospace", fontWeight: 700 }}>
            ΔH drifts {hRange.toFixed(0)}°
          </span>
        )}
      </div>

      <SwatchStrip swatches={swatches} name={name} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
        <Chart title="Lightness (L)" width={220} height={145} yMin={0} yMax={1} yFmt={v => v.toFixed(1)}
          subtitle="Linear ramp — same shape across all families">
          {({ iw, sy }) => <SeriesLine swatches={swatches} metric="L" iw={iw} sy={sy} color={color} dotColor />}
        </Chart>

        <Chart title="Chroma (C)" width={220} height={145} yMin={0} yMax={0.25} yFmt={v => v.toFixed(2)}
          subtitle="Bell curve — peaks at step 50, fades at extremes">
          {({ iw, sy }) => <SeriesLine swatches={swatches} metric="C" iw={iw} sy={sy} color={color} dotColor />}
        </Chart>

        <Chart title="Hue deviation (ΔH°)" width={220} height={145}
          yMin={-45} yMax={15} yFmt={v => `${v > 0 ? "+" : ""}${Math.round(v)}°`} zeroLine={0}
          subtitle={hShifted ? `Drifts ${hRange.toFixed(0)}° — gamut boundary forces hue shift` : "Locked — hue stays at anchor"}>
          {({ iw, sy }) => <SeriesLine swatches={swatches} metric="dH" iw={iw} sy={sy} color={color} dotColor />}
        </Chart>

        {/* Stats table */}
        <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 10, padding: "12px 14px", alignSelf: "flex-start" }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: "#aaa", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'SF Mono',monospace" }}>OKLCH per step</div>
          <table style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["step", "L", "C", "H°", "ΔH"].map(h => (
                  <th key={h} style={{ fontSize: 8, color: "#bbb", fontWeight: 700, textAlign: "right", paddingBottom: 4, paddingLeft: 8, fontFamily: "'SF Mono',monospace" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {swatches.map(s => (
                <tr key={s.step}>
                  <td style={{ paddingLeft: 0, paddingRight: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 2, background: s.hex, flexShrink: 0 }} />
                      <span style={{ fontSize: 8, color: "#999", fontFamily: "'SF Mono',monospace" }}>{s.step}</span>
                    </div>
                  </td>
                  {[s.L.toFixed(3), s.C.toFixed(3), s.H.toFixed(1), `${s.dH > 0 ? "+" : ""}${s.dH.toFixed(1)}`].map((v, i) => (
                    <td key={i} style={{
                      fontSize: 8, textAlign: "right", paddingLeft: 8,
                      fontFamily: "'SF Mono',monospace",
                      color: i === 3 && Math.abs(s.dH) > 5 ? "#b45309" : "#555"
                    }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Cross-Family Comparison Chart ────────────────────────────────────────────

function ComparisonChart({ families, metric, title, yMin, yMax, yFmt, zeroLine, width = 380, height = 190, note }) {
  const pad = { t: 26, r: 16, b: 20, l: 38 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const sy = v => ih * (1 - (v - yMin) / (yMax - yMin));
  const ticks = Array.from({ length: 5 }, (_, i) => yMin + (yMax - yMin) * i / 4);

  return (
    <div>
      <svg width={width} height={height} style={{ overflow: "visible", display: "block" }}>
        <text x={pad.l + iw / 2} y={16} textAnchor="middle" fontSize={11} fontWeight={800} fill="#333">{title}</text>
        <g transform={`translate(${pad.l},${pad.t})`}>
          {ticks.map(v => (
            <g key={v}>
              <line x1={0} y1={sy(v)} x2={iw} y2={sy(v)} stroke="#eee" strokeWidth={1} />
              <text x={-4} y={sy(v) + 3.5} textAnchor="end" fontSize={8} fill="#ccc">{yFmt(v)}</text>
            </g>
          ))}
          {zeroLine != null && (
            <line x1={0} y1={sy(zeroLine)} x2={iw} y2={sy(zeroLine)} stroke="#aaa" strokeWidth={1} strokeDasharray="4 2" />
          )}
          {families.map(f => {
            const n = f.swatches.length;
            const sx = i => (i / (n - 1)) * iw;
            const path = f.swatches.map((s, i) =>
              `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)},${sy(s[metric]).toFixed(1)}`
            ).join("");
            return <path key={f.name} d={path} fill="none" stroke={f.color} strokeWidth={2.5} opacity={0.85} />;
          })}
          {/* Endpoint labels */}
          {families.map(f => {
            const last = f.swatches[f.swatches.length - 1];
            const n = f.swatches.length;
            return (
              <text key={f.name} x={iw + 4} y={sy(last[metric]) + 3.5} fontSize={8} fill={f.color} fontWeight={700}
                fontFamily="'SF Mono',monospace">{f.name[0]}</text>
            );
          })}
        </g>
      </svg>
      <div style={{ display: "flex", gap: 12, marginTop: 6, marginLeft: pad.l, flexWrap: "wrap" }}>
        {families.map(f => (
          <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 16, height: 3, background: f.color, borderRadius: 2 }} />
            <span style={{ fontSize: 9, color: "#888", fontFamily: "'SF Mono',monospace" }}>{f.name}</span>
          </div>
        ))}
      </div>
      {note && <p style={{ margin: "8px 0 0", marginLeft: pad.l, fontSize: 10, color: "#aaa", fontFamily: "'SF Mono',monospace", maxWidth: width - pad.l }}>{note}</p>}
    </div>
  );
}

// ─── Summary Table ────────────────────────────────────────────────────────────

function SummaryTable({ families }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#fafafa", borderBottom: "1px solid #eee" }}>
            {["Family", "Steps", "H anchor", "Max ΔH", "Peak C", "L range", "Note"].map(h => (
              <th key={h} style={{ fontSize: 10, fontWeight: 700, color: "#888", padding: "10px 14px", textAlign: "left", fontFamily: "'SF Mono',monospace" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {families.map((f, i) => {
            const notes = {
              Red: "Extra step 65 — perceptual gap correction",
              Orange: "Extra step 65 — perceptual gap correction",
              Yellow: "Wide L range; hue drifts to olive in shades",
              Green: "Standard 11 steps, stable hue",
              Blue: "Extra step 55 — perceptual gap correction",
              Purple: "Standard 11 steps, stable hue",
            };
            const driftBig = f.hRange > 8;
            return (
              <tr key={f.name} style={{ borderBottom: i < families.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                <td style={{ padding: "9px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: f.color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#222" }}>{f.name}</span>
                  </div>
                </td>
                <td style={{ padding: "9px 14px", fontSize: 11, color: "#555", fontFamily: "'SF Mono',monospace" }}>{f.stepCount}</td>
                <td style={{ padding: "9px 14px", fontSize: 11, color: "#555", fontFamily: "'SF Mono',monospace" }}>{f.baseH.toFixed(0)}°</td>
                <td style={{ padding: "9px 14px", fontSize: 11, fontFamily: "'SF Mono',monospace", fontWeight: 600, color: driftBig ? "#b45309" : "#16a34a" }}>
                  {f.hRange < 2 ? "< 1°" : `${f.hRange.toFixed(0)}°`}
                </td>
                <td style={{ padding: "9px 14px", fontSize: 11, color: "#555", fontFamily: "'SF Mono',monospace" }}>{f.peakC.toFixed(3)}</td>
                <td style={{ padding: "9px 14px", fontSize: 11, color: "#555", fontFamily: "'SF Mono',monospace" }}>{f.lMin.toFixed(2)}–{f.lMax.toFixed(2)}</td>
                <td style={{ padding: "9px 14px", fontSize: 11, color: "#777" }}>{notes[f.name]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Design Philosophy Section ────────────────────────────────────────────────

function PhilosophySection() {
  const cards = [
    {
      icon: "✓",
      iconBg: "#dcfce7",
      iconColor: "#16a34a",
      title: "What IS systematic",
      body: "The OKLCH lightness ramp and chroma bell curve are the same shape across all 6 families. Step 50 is always the vivid anchor, tints fade toward white (L→1, C→0), shades fade toward black (L→0, C→0). This template is the real pattern.",
    },
    {
      icon: "⚠",
      iconBg: "#fef9c3",
      iconColor: "#854d0e",
      title: "What's physically unavoidable",
      body: "Yellow's hue drift is not a design choice — it's a gamut boundary. Dark vivid yellow doesn't exist in sRGB. As L drops below ~0.5 at H≈90°, the color falls outside the displayable gamut and gets clamped toward olive/brown. No algorithm can fix this.",
    },
    {
      icon: "↗",
      iconBg: "#e0e7ff",
      iconColor: "#4338ca",
      title: "What's a human correction",
      body: "The extra steps (65 for Red/Orange, 55 for Blue) were added after visual inspection — the perceptual jump between two adjacent standard steps was too large at those specific hue angles. OKLCH is perceptually uniform on average, but it's not perfect at every hue.",
    },
    {
      icon: "◈",
      iconBg: "#fce7f3",
      iconColor: "#9d174d",
      title: "Yellow's wide L range",
      body: "Vivid yellow (#fad100) sits at L≈0.87 in OKLCH — far higher than Red (L≈0.57), Blue (L≈0.55) or Purple (L≈0.57). Yellow is just a naturally bright color. This compresses the tint range and makes its curves look different, not because of inconsistency but because of physics.",
    },
  ];

  const approaches = [
    {
      label: "A — Pure OKLCH",
      desc: "Same mathematical formula for all families. Accept Yellow's hue drift and gamut clamping. No extra steps. Fully systematic but some colors look wrong to human eyes.",
      pro: "Predictable, automatable",
      con: "Yellow looks brownish; perceptual jumps visible in Red/Blue",
    },
    {
      label: "B — Anchor-relative ramp",
      desc: "Instead of fixing L=0.682 at step 50, anchor each family at its natural peak-chroma L. Yellow anchors at L=0.87, others at their natural vivid L. Ramp is symmetric from there. This is what Radix Colors does.",
      pro: "Handles Yellow's brightness naturally",
      con: "Step 50 has different absolute L per family",
    },
    {
      label: "C — Hybrid (this palette)",
      desc: "OKLCH foundation with human perceptual corrections: extra steps where gaps were too large, Yellow's drift accepted as a known exception. Used by Tailwind, GitHub Primer, Apple HIG.",
      pro: "Best visual quality",
      con: "Requires manual review; not fully automatable",
    },
  ];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 16, fontFamily: "'SF Mono',monospace" }}>
        Is this natural or should it be more systematic?
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        {cards.map(c => (
          <div key={c.title} style={{ flex: "1 1 220px", background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: c.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: c.iconColor, flexShrink: 0 }}>{c.icon}</div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#111" }}>{c.title}</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#666", lineHeight: 1.6 }}>{c.body}</p>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 14, fontFamily: "'SF Mono',monospace" }}>
        Three ways to build a palette system
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {approaches.map((a, i) => (
          <div key={a.label} style={{
            flex: "1 1 200px", background: i === 2 ? "#f0f9ff" : "#fff",
            border: `1px solid ${i === 2 ? "#bae6fd" : "#eee"}`,
            borderRadius: 12, padding: "14px 16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: i === 2 ? "#0369a1" : "#888", fontFamily: "'SF Mono',monospace", background: i === 2 ? "#e0f2fe" : "#f5f5f5", padding: "2px 7px", borderRadius: 4 }}>{a.label}</span>
              {i === 2 && <span style={{ fontSize: 9, color: "#0369a1", fontWeight: 700 }}>← this palette</span>}
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: "#555", lineHeight: 1.6 }}>{a.desc}</p>
            <div style={{ fontSize: 10, color: "#16a34a" }}>✓ {a.pro}</div>
            <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>✗ {a.con}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#92400e" }}>Bottom line: </span>
        <span style={{ fontSize: 11, color: "#78350f", lineHeight: 1.6 }}>
          The variation you see across families is mostly physics, not inconsistency. The shared OKLCH ramp shape IS the pattern.
          The exceptions (Yellow's drift, extra steps) are honest responses to real color science constraints.
          If you want something fully generatable with no manual steps, go with Approach B — anchor each family at its natural peak-chroma L and let the ramp follow.
        </span>
      </div>
    </div>
  );
}

// ─── Pattern Page ─────────────────────────────────────────────────────────────

export default function PatternPage() {
  const families = useFamilyData();

  return (
    <div style={{ padding: "28px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#111", fontFamily: "'Libre Baskerville','Georgia',serif", letterSpacing: "-0.03em", lineHeight: 1 }}>
            Pattern Analysis
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#999", fontFamily: "'SF Mono',monospace" }}>
            L = lightness · C = chroma · H = hue angle · ΔH = hue deviation from anchor
          </p>
        </div>

        {/* Per-family */}
        {families.map(f => <FamilySection key={f.name} family={f} />)}

        {/* Cross-family comparison — 3 charts */}
        <div style={{ marginTop: 8, marginBottom: 40 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 20, fontFamily: "'SF Mono',monospace" }}>
            Cross-Family Comparison — all 6 families overlaid
          </div>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            <ComparisonChart families={families} metric="L" title="Lightness (L)" yMin={0} yMax={1} yFmt={v => v.toFixed(1)}
              note="Same curve shape across all families — this is the shared template. Yellow starts higher because vivid yellow is naturally bright (L≈0.87)." />
            <ComparisonChart families={families} metric="C" title="Chroma (C)" yMin={0} yMax={0.25} yFmt={v => v.toFixed(2)}
              note="Same bell shape, different peak heights. Yellow and Green peak highest — wider gamut at their hue angles." />
            <ComparisonChart families={families} metric="dH" title="Hue deviation (ΔH°)" yMin={-45} yMax={15} yFmt={v => `${v > 0 ? "+" : ""}${Math.round(v)}°`}
              zeroLine={0}
              note="Most families stay flat at 0 — hue is locked. Yellow drifts ~35° toward olive in dark shades. Green shifts slightly. All others: stable." />
          </div>
        </div>

        {/* Summary table */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 14, fontFamily: "'SF Mono',monospace" }}>
            Summary
          </div>
          <SummaryTable families={families} />
        </div>

        {/* Philosophy section */}
        <PhilosophySection />

        <p style={{ fontSize: 10, color: "#ccc", marginTop: 28, fontFamily: "'SF Mono',monospace", textAlign: "center" }}>
          dots colored with actual swatch hex · dashed line = anchor/zero · orange = significant hue drift
        </p>
      </div>
    </div>
  );
}
