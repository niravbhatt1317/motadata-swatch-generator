# Motadata Swatch Generator

A perceptually-uniform color palette tool built for Motadata's design system. Uses the OKLCH color space to generate, compare, and export color swatches with accurate WCAG contrast ratios.

**Live site:** [https://niravbhatt1317.github.io/motadata-swatch-generator/](https://niravbhatt1317.github.io/motadata-swatch-generator/)

---

## What this tool does

The tool generates multi-step color palettes (e.g. `Red-05` through `Red-100`) from a base color, using perceptually-uniform OKLCH math so the visual lightness ramps feel even across all hue families. Each swatch shows its hex value, RGB values, and WCAG contrast ratios against white and black.

---

## Pages

### Swatch Generator (public)
The main page — visible to everyone.

- Shows all 13 reference palettes side by side
- Aligned mode snaps all palettes to a shared step axis for cross-family comparison
- Drag the `⠿⠿` grip on any palette header to reorder columns
- Click any swatch to copy its hex value
- Export the full palette set as CSS custom properties, JSON, or TypeScript `as const`

### Developer pages (password-protected)
Access via `?dev` in the URL or by typing `palette` anywhere on the page (outside an input). Password: `Trames@1317`. Session persists until the browser tab is closed.

| Page | What it shows |
|------|--------------|
| Pattern Analysis | Reverse-engineered OKLCH generation rules — step anatomy, hue angles, exception families |
| Neutral Palette | Blue-tinted gray scale (H≈244°), pixel-sampled from the reference design |
| Correlation | Cross-palette correlation analysis |
| Color Science | Deep-dive OKLCH math and perceptual uniformity |

---

## Color data

All palette data lives in `src/colorData.js`.

### Reference palettes (`REFERENCE_PALETTES`)

Exact pixel-sampled values — these are locked and cannot be edited from the UI. Keyed by their step-50 hex value.

| Name | Base (step-50) | Source | Steps |
|------|---------------|--------|-------|
| Red | `#ec5b5b` | Motadata design system | 12 (includes step 65) |
| Orange | `#fa9950` | Motadata design system | 12 (includes step 65) |
| Yellow | `#fad100` | Motadata design system | 11 |
| Green | `#36d576` | Motadata design system | 11 |
| Blue | `#008cff` | Motadata design system | 12 (includes step 55) |
| Purple | `#8c5bd8` | Motadata design system | 11 |
| Teal | `#00cfb3` | OKLCH screenshot — H≈180° | 12 |
| Sky | `#00cae7` | OKLCH screenshot — H≈210° | 12 |
| Pink | `#f892d1` | OKLCH screenshot — H≈343° | 12 |
| Indigo | `#9daeff` | OKLCH screenshot — H≈275° | 12 |
| Lime | `#b0d000` | OKLCH screenshot — H≈120° | 12 |
| Coral | `#ff978f` | OKLCH screenshot — H≈25° | 12 |
| Emerald | `#00ce91` | OKLCH screenshot — H≈165° | 12 |

### Generation algorithms (`ALGORITHMS`)

For non-reference (preset) palettes, the tool generates swatches using OKLCH math. Four algorithms are available, auto-detected from the base color's hue angle:

| Algorithm | Hue range | Behaviour |
|-----------|-----------|-----------|
| `yellow` | H ≈ 60–100° | Aggressive chroma reduction toward dark end to avoid olive shift |
| `orange` | H ≈ 30–60° | Moderate warm-end chroma boost |
| `blue` | H ≈ 210–270° | Extra step at 55 to fill perceptual gap 50→60 |
| `stable` | Everything else | Standard linear chroma interpolation |

### Step definitions (`STEP_DEFS`)

Standard scale: `05, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100`.
Certain families add extra steps to fill perceptual gaps:
- Red + Orange → extra `65` between 60 and 70
- Blue → extra `55` between 50 and 60

### Reverse-engineered pattern

| Aspect | Rule |
|--------|------|
| Color space | OKLCH (perceptually uniform) |
| Chroma | Interpolates linearly to 0 toward white and black ends |
| Hue | Stays constant throughout the scale |
| Lightness | Mapped from 0.99 (step-05) down to ~0.20 (step-100) |
| WCAG numbers | Top-right = contrast vs white · bottom-right = contrast vs black |

---

## Neutral palette

Blue-tinted grays, H≈244° (same hue family as the Blue accent). Pixel-sampled from the reference design. Includes two text-use breakpoints:

- `step-75` (`#516381`) — AA text minimum
- `step-93` (`#1D2A3E`) — AAA text minimum

---

## Custom color flow

Users in dev mode can add a custom color with `+ Add Color`. The color is:

1. Added locally with `source: "custom"` and persisted in `localStorage`
2. Optionally committed to `colorData.js` via the **Save to codebase** button, which uses the GitHub Contents API to GET → patch → PUT the file directly from the browser, triggering a GitHub Actions redeploy (~2 min)
3. Deletable from GitHub via the trash icon → **Delete from GitHub** modal (same GET → patch → PUT flow, removes the entry)

After saving or deleting, a **Reload (cache-busted)** button adds `?_cb=<timestamp>` to the URL, forcing the browser to bypass its cache and fetch the latest build. The `_cb` param is silently cleaned from the URL bar on load via `history.replaceState`.

Entries saved to `colorData.js` get a `tag:"custom"` field so the app can recognise them as `inCode: true` on reload and show the delete option.

---

## localStorage

The palette order and any in-progress custom colors are saved to `localStorage` under:

- `my-palette-palettes` — serialised palette array
- `my-palette-version` — current schema version (bump `PALETTE_VERSION` in `PalettePage.jsx` to force a reset when reference palettes change)

If the saved version is older than `PALETTE_VERSION`, localStorage is discarded and the app reloads from `PRESETS`.

To manually clear (useful after a deploy that removes a color): open the browser console and run:

```js
localStorage.removeItem("my-palette-palettes");
localStorage.removeItem("my-palette-version");
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19 |
| Build | Vite 5 |
| Color math | Pure OKLCH — no external color library |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions (auto-deploy on push to `main`) |
| GitHub API | Contents API (read/write `colorData.js` from browser) |

---

## Project structure

```
src/
  colorData.js          # All OKLCH math + REFERENCE_PALETTES + PRESETS + NEUTRAL_PALETTE
  PalettePage.jsx       # Main swatch generator page (public)
  PatternPage.jsx       # Pattern analysis (dev only)
  NeutralPage.jsx       # Neutral palette viewer (dev only)
  CorrelationPage.jsx   # Correlation analysis (dev only)
  ColorSciencePage.jsx  # Color science deep-dive (dev only)
  App.jsx               # Nav, dev-mode gate, password modal, keyboard shortcut
  main.jsx
  index.css
.github/workflows/
  deploy.yml            # Build + deploy to GitHub Pages on push to main
vite.config.js          # savePresetPlugin (dev-only POST /api/save-preset endpoint)
```

---

## Local development

```bash
npm install
npm run dev
```

Create `.env.local` with your GitHub token (needs `contents: write` on this repo):

```
VITE_GITHUB_TOKEN=ghp_...
```

The token is baked into the JS bundle at build time. It is used for the Save to codebase and Delete from GitHub flows. The same token is stored as a GitHub Actions secret (`VITE_GITHUB_TOKEN`) for production builds.

---

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which:

1. Runs `npm ci`
2. Runs `npm run build` with:
   - `VITE_BASE_URL=/motadata-swatch-generator/`
   - `VITE_GITHUB_TOKEN` from repository secrets
3. Deploys the `dist/` folder to GitHub Pages

Typical deploy time: ~2 minutes after push.

---

## Dev access

| Method | How |
|--------|-----|
| URL param | Navigate to `?dev` — prompts for password |
| Keyboard shortcut | Type `palette` anywhere (not in an input) — prompts for password |
| Password | `Trames@1317` (case-sensitive) |
| Session | Persists in `sessionStorage` until tab is closed |
| Toggle off | Type `palette` again while in dev mode |

The dev link is also visible at the very bottom of the main page (low-contrast, for reference).
