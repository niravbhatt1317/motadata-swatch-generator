// ─── OKLCH ↔ sRGB Math ───────────────────────────────────────────────────────

export function sRGBToLinear(c) {
  const n = c / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}
export function linearToSRGB(c) {
  const v = Math.max(0, Math.min(1, c));
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}
export function hexToRGB(hex) {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}
export function rgbToHex(r,g,b) {
  return "#" + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
}
export function rgbToOKLCH(r,g,b) {
  const lr=sRGBToLinear(r), lg=sRGBToLinear(g), lb=sRGBToLinear(b);
  const x=0.4124564*lr+0.3575761*lg+0.1804375*lb;
  const y=0.2126729*lr+0.7151522*lg+0.0721750*lb;
  const z=0.0193339*lr+0.1191920*lg+0.9503041*lb;
  const l_=Math.cbrt(0.8189330101*x+0.3618667424*y-0.1288597137*z);
  const m_=Math.cbrt(0.0329845436*x+0.9293118715*y+0.0361456387*z);
  const s_=Math.cbrt(0.0482003018*x+0.2643662691*y+0.6338517070*z);
  const L=0.2104542553*l_+0.7936177850*m_-0.0040720468*s_;
  const a=1.9779984951*l_-2.4285922050*m_+0.4505937099*s_;
  const bv=0.0259040371*l_+0.7827717662*m_-0.8086757660*s_;
  return { L, C: Math.sqrt(a*a+bv*bv), H: ((Math.atan2(bv,a)*180/Math.PI)+360)%360 };
}
export function oklchToRGB(L,C,H) {
  const a=C*Math.cos(H*Math.PI/180), bv=C*Math.sin(H*Math.PI/180);
  const l_=L+0.3963377774*a+0.2158037573*bv;
  const m_=L-0.1055613458*a-0.0638541728*bv;
  const s_=L-0.0894841775*a-1.2914855480*bv;
  const l=l_**3, m=m_**3, s=s_**3;
  const x=1.2270138511*l-0.5577999807*m+0.2812561490*s;
  const y=-0.0405801784*l+1.1122568696*m-0.0716766787*s;
  const z=-0.0763812845*l-0.4214819784*m+1.5861632204*s;
  const lr=3.2404542*x-1.5371385*y-0.4985314*z;
  const lg=-0.9692660*x+1.8760108*y+0.0415560*z;
  const lb=0.0556434*x-0.2040259*y+1.0572252*z;
  return {
    r: Math.round(Math.min(255,Math.max(0,linearToSRGB(lr)*255))),
    g: Math.round(Math.min(255,Math.max(0,linearToSRGB(lg)*255))),
    b: Math.round(Math.min(255,Math.max(0,linearToSRGB(lb)*255)))
  };
}
export function getLuminance(r,g,b) {
  return 0.2126*sRGBToLinear(r)+0.7152*sRGBToLinear(g)+0.0722*sRGBToLinear(b);
}
export function wcagContrast(l1,l2) {
  const [hi,lo]=l1>l2?[l1,l2]:[l2,l1];
  return +((hi+0.05)/(lo+0.05)).toFixed(2);
}

// ─── Exact Reference Palettes ─────────────────────────────────────────────────

export const REFERENCE_PALETTES = {
  "#ec5b5b": {
    baseStep: "50",
    swatches: [
      { step:"05",  hex:"#fef5f5" },
      { step:"10",  hex:"#feecec" },
      { step:"20",  hex:"#fccfcf" },
      { step:"30",  hex:"#f6b1b1" },
      { step:"40",  hex:"#f58a8a" },
      { step:"50",  hex:"#ec5b5b" },
      { step:"60",  hex:"#db132a" },
      { step:"65",  hex:"#c72323" },
      { step:"70",  hex:"#ad1111" },
      { step:"80",  hex:"#750c0c" },
      { step:"90",  hex:"#4a0b0b" },
      { step:"100", hex:"#310c0c" },
    ],
  },
  "#fa9950": {
    baseStep: "50",
    swatches: [
      { step:"05",  hex:"#fdf7f4" },
      { step:"10",  hex:"#fef5ee" },
      { step:"20",  hex:"#fddcc4" },
      { step:"30",  hex:"#fac2a0" },
      { step:"40",  hex:"#ffb37a" },
      { step:"50",  hex:"#fa9950" },
      { step:"60",  hex:"#f47c22" },
      { step:"65",  hex:"#e56b19" },
      { step:"70",  hex:"#c35323" },
      { step:"80",  hex:"#8d3118" },
      { step:"90",  hex:"#541914" },
      { step:"100", hex:"#40130f" },
    ],
  },
  "#fad100": {
    baseStep: "50",
    swatches: [
      { step:"05",  hex:"#fffdf4" },
      { step:"10",  hex:"#fffbea" },
      { step:"20",  hex:"#fff1b3" },
      { step:"30",  hex:"#ffe980" },
      { step:"40",  hex:"#ffdd35" },
      { step:"50",  hex:"#fad100" },
      { step:"60",  hex:"#e8b407" },
      { step:"70",  hex:"#c28e00" },
      { step:"80",  hex:"#855c15" },
      { step:"90",  hex:"#543308" },
      { step:"100", hex:"#3d2106" },
    ],
  },
  "#36d576": {
    baseStep: "50",
    swatches: [
      { step:"05",  hex:"#f5fdf8" },
      { step:"10",  hex:"#edfdf3" },
      { step:"20",  hex:"#d1fae0" },
      { step:"30",  hex:"#a2f6c3" },
      { step:"40",  hex:"#7beaa5" },
      { step:"50",  hex:"#36d576" },
      { step:"60",  hex:"#14b053" },
      { step:"70",  hex:"#0e7c3a" },
      { step:"80",  hex:"#0b602d" },
      { step:"90",  hex:"#0d3a1f" },
      { step:"100", hex:"#052912" },
    ],
  },
  "#008cff": {
    baseStep: "50",
    swatches: [
      { step:"05",  hex:"#f4f9ff" },
      { step:"10",  hex:"#ebf4ff" },
      { step:"20",  hex:"#cce4ff" },
      { step:"30",  hex:"#99cdff" },
      { step:"40",  hex:"#66b3ff" },
      { step:"50",  hex:"#008cff" },
      { step:"55",  hex:"#006dfa" },
      { step:"60",  hex:"#0263e0" },
      { step:"70",  hex:"#043cb5" },
      { step:"80",  hex:"#001489" },
      { step:"90",  hex:"#030b5d" },
      { step:"100", hex:"#06033a" },
    ],
  },
  "#8c5bd8": {
    baseStep: "50",
    swatches: [
      { step:"05",  hex:"#faf7fd" },
      { step:"10",  hex:"#f5f0fc" },
      { step:"20",  hex:"#e7dcfa" },
      { step:"30",  hex:"#c8aff0" },
      { step:"40",  hex:"#a67fe3" },
      { step:"50",  hex:"#8c5bd8" },
      { step:"60",  hex:"#6d2ed1" },
      { step:"70",  hex:"#5817bd" },
      { step:"80",  hex:"#380e78" },
      { step:"90",  hex:"#22094a" },
      { step:"100", hex:"#160433" },
    ],
  },
  // Sky — H=210°, OKLCH-sourced, 12 steps
  "#00cae7": {
    baseStep: "50",
    swatches: [
      { step:"05", hex:"#f4fdff" }, { step:"10", hex:"#ebfbff" },
      { step:"15", hex:"#d1f9ff" }, { step:"20", hex:"#b8f4ff" },
      { step:"25", hex:"#9ceefd" }, { step:"30", hex:"#7be6f9" },
      { step:"40", hex:"#47dbf2" }, { step:"50", hex:"#00cae7" },
      { step:"60", hex:"#00a0c1" }, { step:"65", hex:"#0092b4" },
      { step:"70", hex:"#006b85" }, { step:"80", hex:"#004655" },
    ],
  },
  // Pink — H=343°, OKLCH-sourced, 12 steps
  "#f892d1": {
    baseStep: "50",
    swatches: [
      { step:"05", hex:"#fff9fd" }, { step:"10", hex:"#fff5fc" },
      { step:"15", hex:"#ffe9fa" }, { step:"20", hex:"#ffdef6" },
      { step:"25", hex:"#ffd1f2" }, { step:"30", hex:"#ffc2eb" },
      { step:"40", hex:"#ffaee1" }, { step:"50", hex:"#f892d1" },
      { step:"60", hex:"#d555aa" }, { step:"65", hex:"#c8449d" },
      { step:"70", hex:"#953175" }, { step:"80", hex:"#60234b" },
    ],
  },
  // Indigo — H=275°, OKLCH-sourced, 12 steps
  "#9daeff": {
    baseStep: "50",
    swatches: [
      { step:"05", hex:"#fafbff" }, { step:"10", hex:"#f5f8ff" },
      { step:"15", hex:"#ebf1ff" }, { step:"20", hex:"#e0e9ff" },
      { step:"25", hex:"#d5e0ff" }, { step:"30", hex:"#c7d5ff" },
      { step:"40", hex:"#b5c5ff" }, { step:"50", hex:"#9daeff" },
      { step:"60", hex:"#6c7af7" }, { step:"65", hex:"#606cec" },
      { step:"70", hex:"#464eb0" }, { step:"80", hex:"#2e3470" },
    ],
  },
  // Lime — H=120°, OKLCH-sourced, 12 steps
  "#b0d000": {
    baseStep: "50",
    swatches: [
      { step:"05", hex:"#fbfdf4" }, { step:"10", hex:"#f6fcea" },
      { step:"15", hex:"#eefad0" }, { step:"20", hex:"#e6f6b8" },
      { step:"25", hex:"#ddf19f" }, { step:"30", hex:"#d2ea81" },
      { step:"40", hex:"#c3e05a" }, { step:"50", hex:"#b0d000" },
      { step:"60", hex:"#91af00" }, { step:"65", hex:"#829e00" },
      { step:"70", hex:"#5d7100" }, { step:"80", hex:"#3a4700" },
    ],
  },
  // Coral — H=25°, OKLCH-sourced, 12 steps
  "#ff978f": {
    baseStep: "50",
    swatches: [
      { step:"05", hex:"#fffaf9" }, { step:"10", hex:"#fff6f4" },
      { step:"15", hex:"#ffebe7" }, { step:"20", hex:"#ffe0db" },
      { step:"25", hex:"#ffd4cd" }, { step:"30", hex:"#ffc5bd" },
      { step:"40", hex:"#ffb2a9" }, { step:"50", hex:"#ff978f" },
      { step:"60", hex:"#ec5955" }, { step:"65", hex:"#e04746" },
      { step:"70", hex:"#a83433" }, { step:"80", hex:"#6c2624" },
    ],
  },
  // Emerald — H=165°, OKLCH-sourced, 12 steps
  "#00ce91": {
    baseStep: "50",
    swatches: [
      { step:"05", hex:"#f4fef9" }, { step:"10", hex:"#ebfcf4" },
      { step:"15", hex:"#d3fae8" }, { step:"20", hex:"#bbf6db" },
      { step:"25", hex:"#9ff1cd" }, { step:"30", hex:"#80e9be" },
      { step:"40", hex:"#51deaa" }, { step:"50", hex:"#00ce91" },
      { step:"60", hex:"#00a465" }, { step:"65", hex:"#009658" },
      { step:"70", hex:"#006f40" }, { step:"80", hex:"#00482a" },
    ],
  },
  // Teal — H=180°, OKLCH-sourced, 12 steps
  "#00cfb3": {
    baseStep: "50",
    swatches: [
      { step:"05",  hex:"#f4fefc" },
      { step:"10",  hex:"#ebfcf8" },
      { step:"15",  hex:"#d1faf1" },
      { step:"20",  hex:"#b8f6e9" },
      { step:"25",  hex:"#9cf1df" },
      { step:"30",  hex:"#7ae9d4" },
      { step:"40",  hex:"#45dfc6" },
      { step:"50",  hex:"#00cfb3" },
      { step:"60",  hex:"#00a68a" },
      { step:"65",  hex:"#00987d" },
      { step:"70",  hex:"#00705b" },
      { step:"80",  hex:"#00493b" },
    ],
  },
};

// ─── Neutral Palette (pixel-sampled from reference) ──────────────────────────
// Blue-tinted grays. H ≈ 244° throughout — same hue family as the Blue accent.

export const NEUTRAL_PALETTE = [
  { step:"05",  hex:"#F6F9FC", isText:false },
  { step:"10",  hex:"#ECF1F9", isText:false },
  { step:"20",  hex:"#E3E8F2", isText:false },
  { step:"30",  hex:"#CAD3E2", isText:false },
  { step:"40",  hex:"#8E9FBC", isText:false },
  { step:"50",  hex:"#7186A8", isText:false },
  { step:"60",  hex:"#6A7FA0", isText:false },
  { step:"70",  hex:"#5A6D8C", isText:false },
  { step:"75",  hex:"#516381", isText:true  }, // AA text minimum
  { step:"80",  hex:"#485975", isText:false },
  { step:"90",  hex:"#2B394F", isText:false },
  { step:"92",  hex:"#243147", isText:false },
  { step:"93",  hex:"#1D2A3E", isText:true  }, // AAA text minimum
  { step:"94",  hex:"#172336", isText:false },
  { step:"95",  hex:"#111C2C", isText:false },
  { step:"96",  hex:"#0B1628", isText:false },
];

export const PRESETS = [
  { name:"Red",     color:"#ec5b5b", step:"50" },
  { name:"Orange",  color:"#fa9950", step:"50" },
  { name:"Yellow",  color:"#fad100", step:"50" },
  { name:"Green",   color:"#36d576", step:"50" },
  { name:"Blue",    color:"#008cff", step:"50" },
  { name:"Purple",  color:"#8c5bd8", step:"50" },
  { name:"Teal",    color:"#00cfb3", step:"50" },
  { name:"Sky",     color:"#00cae7", step:"50" },
  { name:"Pink",    color:"#f892d1", step:"50" },
  { name:"Indigo",  color:"#9daeff", step:"50" },
  { name:"Lime",    color:"#b0d000", step:"50" },
  { name:"Coral",   color:"#ff978f", step:"50" },
  { name:"Emerald", color:"#00ce91", step:"50" },
  { name:"Custoasm", color:"#6366f1", step:"50" },
  { name:"Custom color", color:"#6366f1", step:"50" },
];

// Pre-computed OKLCH H for each preset base-50 color — used for family classification
export const FAMILY_ANCHORS = PRESETS.map(({ name, color }) => {
  const { r, g, b } = hexToRGB(color);
  const oklch = rgbToOKLCH(r, g, b);
  return { name, color, H: oklch.H, L: oklch.L, C: oklch.C };
});

export function classifyFamily(hex) {
  try {
    const { r, g, b } = hexToRGB(hex);
    const oklch = rgbToOKLCH(r, g, b);
    let nearest = null;
    let minDH = Infinity;
    const distances = FAMILY_ANCHORS.map(anchor => {
      let dH = Math.abs(oklch.H - anchor.H);
      if (dH > 180) dH = 360 - dH;
      if (dH < minDH) { minDH = dH; nearest = anchor; }
      return { ...anchor, dH };
    }).sort((a, b) => a.dH - b.dH);
    return { ...oklch, nearest, distances };
  } catch { return null; }
}

export const STEP_DEFS = [
  { step:"05",  L:0.973 },
  { step:"10",  L:0.953 },
  { step:"20",  L:0.912 },
  { step:"30",  L:0.856 },
  { step:"40",  L:0.783 },
  { step:"50",  L:0.682 },
  { step:"60",  L:0.571 },
  { step:"70",  L:0.457 },
  { step:"80",  L:0.350 },
  { step:"90",  L:0.262 },
  { step:"100", L:0.198 },
];

// ─── Algorithm registry ───────────────────────────────────────────────────────

export const ALGORITHMS = [
  {
    id: "auto",
    label: "Auto-detect",
    shortLabel: "Auto",
    desc: "Reads H° from your color and picks the tuned algorithm automatically",
    families: null,
  },
  {
    id: "default",
    label: "Default",
    shortLabel: "Default",
    desc: "Linear L · linear C reduction · fixed H throughout",
    families: null,
  },
  {
    id: "yellow",
    label: "Yellow-family",
    shortLabel: "Yellow",
    desc: "Fast C drop on light end (yellow is already near-white) · dark steps drift toward golden-brown · H correction toward orange",
    families: ["Yellow"],
  },
  {
    id: "orange",
    label: "Orange-family",
    shortLabel: "Orange",
    desc: "Moderate gamma on dark L · dark steps shade toward red-brown (H drift) · faster C drop on light end",
    families: ["Orange"],
  },
  {
    id: "blue",
    label: "Blue-family",
    shortLabel: "Blue",
    desc: "H strictly pinned to resist low-chroma instability · maintains chroma slightly longer on light steps",
    families: ["Blue"],
  },
  {
    id: "stable",
    label: "Red / Green / Purple",
    shortLabel: "Stable",
    desc: "Standard L curve · slightly faster C on light end to avoid neon; good for Red, Green, Purple",
    families: ["Red", "Green", "Purple"],
  },
];

// Map H° → recommended algorithm id
export function detectAlgoFromH(H) {
  if (H >= 74  && H < 124)  return "yellow";
  if (H >= 40  && H < 74)   return "orange";
  if (H >= 200 && H < 280)  return "blue";
  return "stable";  // Red [0-40], Green [124-200], Purple [280-360]
}

export function recommendedAlgo(hex) {
  try {
    const { r, g, b } = hexToRGB(hex);
    const { H } = rgbToOKLCH(r, g, b);
    return detectAlgoFromH(H);
  } catch { return "default"; }
}

// ─── Core palette generator (algorithm-aware) ─────────────────────────────────

export function generatePalette(baseHex, baseStepKey="50", algoId="auto") {
  const key = baseHex.toLowerCase();
  const ref = REFERENCE_PALETTES[key];
  if (ref && ref.baseStep === baseStepKey) {
    return ref.swatches.map(({ step, hex }) => {
      const { r, g, b } = hexToRGB(hex);
      const lum = getLuminance(r, g, b);
      return { step, hex, r, g, b, lum,
        vsWhite: wcagContrast(lum, 1), vsBlack: wcagContrast(lum, 0) };
    });
  }
  try {
    const { r, g, b } = hexToRGB(baseHex);
    const { L:baseL, C:baseC, H:baseH } = rgbToOKLCH(r, g, b);
    const baseDef = STEP_DEFS.find(s => s.step === baseStepKey) || STEP_DEFS[5];

    // Resolve "auto" → specific algo id
    const algo = algoId === "auto" ? detectAlgoFromH(baseH) : algoId;

    return STEP_DEFS.map(({ step, L:targetL }) => {
      let L, C, H;

      if (step === baseStepKey) {
        L = baseL; C = baseC; H = baseH;
      } else if (targetL > baseDef.L) {
        // ── Light steps (going toward white) ──────────────────────────────
        const t = (targetL - baseDef.L) / (1 - baseDef.L);
        L = baseL + t * (1 - baseL);
        H = baseH;
        switch (algo) {
          case "yellow":
            // Yellow is already nearly white at base — chroma collapses very fast
            C = Math.max(0, baseC * (1 - t) * 0.55);
            break;
          case "orange":
            // Slightly faster C drop; oranges become washed-out peach quickly
            C = Math.max(0, baseC * (1 - t) * 0.80);
            break;
          case "blue":
            // Preserve chroma a bit longer so light blues don't go flat grey
            C = Math.max(0, baseC * (1 - t) * 1.18);
            break;
          case "stable":
            // Faster C drop on light end to keep green/purple from going neon
            C = Math.max(0, baseC * (1 - t) * 0.88);
            break;
          default: // "default"
            C = Math.max(0, baseC * (1 - t));
        }
      } else {
        // ── Dark steps (going toward black) ───────────────────────────────
        const t = (baseDef.L - targetL) / baseDef.L;
        switch (algo) {
          case "yellow":
            // Gamma < 1 pulls dark steps to lower L (raw algo overshoots for high-baseL yellows)
            L = baseL * (1 - Math.pow(t, 0.72));
            C = Math.max(0, baseC * (1 - t) * 0.85);
            // Drift H toward orange at the dark end (dark yellow IS golden-brown)
            H = baseH - 20 * t;
            break;
          case "orange":
            // Moderate gamma; H drifts toward red-brown at dark end
            L = baseL * (1 - Math.pow(t, 0.88));
            C = Math.max(0, baseC * (1 - t) * 0.92);
            H = baseH - 16 * t;
            break;
          case "blue":
            // Standard L; H strictly pinned (resist indigo drift)
            L = baseL * (1 - t);
            C = Math.max(0, baseC * (1 - t));
            H = baseH;
            break;
          case "stable":
            L = baseL * (1 - t);
            C = Math.max(0, baseC * (1 - t) * 0.93);
            H = baseH;
            break;
          default:
            L = baseL * (1 - t);
            C = Math.max(0, baseC * (1 - t));
            H = baseH;
        }
      }

      const rgb = oklchToRGB(L, C, H);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      const lum = getLuminance(rgb.r, rgb.g, rgb.b);
      return { step, hex, r:rgb.r, g:rgb.g, b:rgb.b, lum,
        vsWhite: wcagContrast(lum, 1), vsBlack: wcagContrast(lum, 0) };
    });
  } catch { return []; }
}
