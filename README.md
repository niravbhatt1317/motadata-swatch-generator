# Motadata Swatch Generator

A perceptually-uniform color palette tool built with OKLCH color space. Generate, compare, and export design system color swatches with accurate WCAG contrast ratios.

## Features

- **Swatch Generator** — Generate 12-step OKLCH palettes from any base color. Includes exact reference palettes (Teal, Sky, Pink, Indigo, Lime, Coral, Emerald) and algorithmic palettes (Red, Orange, Yellow, Green, Blue, Purple).
- **Aligned grid mode** — Snap all palettes to a shared step axis to compare tones across families side by side.
- **Drag to reorder** — Rearrange palette columns by dragging the header grip.
- **Algorithm selector** — Per-family tuned algorithms (Yellow, Orange, Blue, Stable) with auto-detection from H°.
- **Export** — Copy palette as CSS custom properties, JSON, or TypeScript `as const`.
- **Auto-save** — Custom colors persist in `localStorage` per browser session.

## Stack

- React 19 + Vite 5
- Pure OKLCH color math (no external color library)
- GitHub Actions → GitHub Pages deployment

## Live

[https://niravbhatt1317.github.io/motadata-swatch-generator/](https://niravbhatt1317.github.io/motadata-swatch-generator/)
