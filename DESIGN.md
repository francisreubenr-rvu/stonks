# Stonks — DESIGN.md

Design system for **Stonks**, an Indian stock market research tool. **Midnight Terminal**: deep-ink surfaces, phosphor-green data, data-dense, editorial. The aesthetic reference points are a Bloomberg terminal at 2am and a well-set financial broadsheet — not a SaaS marketing site.

This file is the source of truth for `figma-cli import`. Token names are stable identifiers; do not rename.

> **Rework note (2026-07):** this system replaced the original light-only theme
> after a side-by-side rebuild-and-compare. The token *contract* (names,
> component specs, spacing, motion rules) is unchanged from the light system —
> only values changed — so pages written against tokens re-skinned untouched.

---

## 0. Design Principles

- **Dark mode only.** Ink canvas (`#0A0D13`), raised-ink cards (`#10141C`). No white surfaces; light comes from the data, not the chrome.
- **One accent.** Phosphor emerald (`#34D399`) is the only brand color. Used sparingly: primary CTA, active nav underline, positive financial delta, the live-dot. Never as a background wash or decoration.
- **Color carries meaning.** Red = negative/destructive only. Amber/orange = risk badges only. Neither is ever decorative.
- **Borders over shadows.** Prefer a 1px hairline (`#1F2633`) to a drop shadow for separating static surfaces. Shadows exist only on floating layers (dropdowns, tooltips).
- **No gradients as decoration, no glassmorphism, no purple, no blue-500/indigo.** The only permitted atmosphere is the fixed sub-2% scanline/vignette overlay defined in `index.css`.
- **Data-dense but breathable.** Tight enough to scan a table at a glance; loose enough not to feel cramped.
- **Numbers speak mono.** Every numeric value renders in IBM Plex Mono with tabular figures. Display headlines are Fraunces; body is IBM Plex Sans.

---

## 1. Color Tokens

Hex is canonical for implementation. All values live in `src/index.css` `:root`.

### 1.1 Background & Surface

| Token | Hex | Usage |
|---|---|---|
| `color.background` | `#0A0D13` | App canvas / page background. Deep ink. |
| `color.surface` | `#10141C` | Raised surfaces above background: sticky nav, table container. |
| `color.card` | `#10141C` | Cards (index cards, fundamentals panel). Raised ink, separated by `color.border`. |
| `color.popover` | `#141924` | Floating layers: dropdowns, tooltips. |
| `color.muted` | `#171C26` | Muted fills: table header row, inactive tab, code/symbol chips, hover wells. |

### 1.2 Foreground / Text

| Token | Hex | Usage |
|---|---|---|
| `color.foreground` | `#E7EDF4` | Primary text, headings, key values. Soft paper-white. |
| `color.muted-foreground` | `#8B98AC` | Secondary text: labels, captions, table sub-text, fund category. |
| `color.subtle` | `#5C6A80` | Tertiary: placeholders, disabled text, axis date labels. |

### 1.3 Semantic / Interactive

| Token | Hex | Usage |
|---|---|---|
| `color.primary` | `#34D399` | Phosphor emerald. Primary button bg, active nav underline, focus ring, live-dot. |
| `color.primary-hover` | `#6EE7B7` | Brighter on hover (dark-mode inversion of the usual darken). |
| `color.primary-foreground` | `#06251A` | Text/icon on `color.primary` — near-black green. |
| `color.primary-subtle` | `#0C2B1F` | Deep-green tint wells. Active/selected highlight backgrounds. Use rarely. |
| `color.destructive` | `#F87171` | Red-400 (dark-contrast red). Destructive actions, error text, negative state. |
| `color.destructive-hover` | `#FCA5A5` | Destructive hover. |
| `color.border` | `#1F2633` | Hairline ink border: cards, tables, dividers, inputs. |
| `color.border-strong` | `#2E3A4E` | Emphasized border: input hover, card hover. |
| `color.input` | `#1F2633` | Input border. |
| `color.ring` | `#34D399` | Focus ring (matches primary). |

### 1.4 Financial Semantic

| Token | Hex | Usage |
|---|---|---|
| `color.delta-positive` | `#3DDC97` | Positive returns / up deltas. Numbers + ▲ glyph. tabular-nums. |
| `color.delta-positive-bg` | `#0C2B1F` | Well behind up direction badge. |
| `color.delta-negative` | `#F87171` | Negative returns / down deltas. Numbers + ▼ glyph. tabular-nums. |
| `color.delta-negative-bg` | `#2B1418` | Well behind down direction badge. |
| `color.delta-neutral` | `#8B98AC` | Flat / 0.00% delta. |

### 1.5 Risk Badges

Dark wells with luminous text — same four-tier scale.

| Token | bg | fg | border |
|---|---|---|---|
| `color.risk-low` | `#0C2B1F` | `#4ADE80` | `#1E5C40` |
| `color.risk-moderate` | `#2A2410` | `#FACC15` | `#6B5D1A` |
| `color.risk-high` | `#2B1B10` | `#FB923C` | `#7C4A1E` |
| `color.risk-very-high` | `#2B1418` | `#F87171` | `#7F2A2E` |

### 1.6 Atmosphere (rework-only tokens)

| Token | Value | Usage |
|---|---|---|
| `--glow-positive` | `0 0 14px rgba(61,220,151,0.28)` | Live-dot / phosphor accents only. Never on body text. |
| `--glow-negative` | `0 0 14px rgba(248,113,113,0.22)` | Reserved; use sparingly. |
| `--shadow-dropdown` | `0 8px 24px -4px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)` | Floating layers only. |

The fixed body overlay (scanlines at 1.5% + a top phosphor vignette at 5%) is defined once in `index.css` and must stay below 2% perceived opacity.

---

## 2. Typography

Three-family system, loaded via Google Fonts (`index.html`) with system fallbacks.

### 2.1 Font Families

```
font.display: "Fraunces", Georgia, serif              — h1/h2, hero headlines, wordmark (italic)
font.body:    "IBM Plex Sans", system-ui, sans-serif  — body, labels, controls
font.data:    "IBM Plex Mono", ui-monospace, Menlo, monospace — every numeric value, tickers, code
```

### 2.2 Type Scale

| Token | Size | Line height | Tracking | Use |
|---|---|---|---|---|
| `text.xs` | 12px | 16px | 0.01em | Badge text, sub-labels, axis dates, footnotes |
| `text.sm` | 14px | 20px | 0 | Nav links, table cells, secondary body, buttons |
| `text.base` | 16px | 24px | 0 | Default body, paragraphs, form inputs |
| `text.lg` | 18px | 28px | 0 | Card titles, section subheads |
| `text.xl` | 20px | 28px | -0.005em | Index card values, panel headings |
| `text.2xl` | 24px | 32px | -0.01em | Symbol ticker, page H2 |
| `text.3xl` | 30px | 36px | -0.015em | Symbol price |
| `text.4xl` | 36px | 40px | -0.02em | Landing hero headline |

### 2.3 Weights

| Token | Value | Use |
|---|---|---|
| `weight.normal` | 400 | Body, table cells |
| `weight.medium` | 500 | Nav links, buttons, table headers |
| `weight.semibold` | 600 | Card titles, prices, section heads |
| `weight.bold` | 700 | Symbol ticker |

---

## 3. Spacing (4px grid)

| Token | Value | Common uses |
|---|---|---|
| `space.1` | 4px | Icon-to-text gap, badge vertical padding |
| `space.2` | 8px | Badge horizontal padding, inline gaps |
| `space.3` | 12px | Table cell padding (vertical), input vertical |
| `space.4` | 16px | Card padding, table cell horizontal, button px |
| `space.5` | 20px | Gap between stacked cards |
| `space.6` | 24px | Section padding, indices grid gap |
| `space.8` | 32px | Page content padding, major section break |
| `space.10` | 40px | Spacing above page title |
| `space.12` | 48px | Nav bar height |
| `space.16` | 64px | Hero vertical padding |
| `space.20` | 80px | Max hero / empty-state vertical padding |

### Layout Constants

```
layout.nav-height:        48px
layout.page-max-width:    1200px
layout.content-gutter:    24px  (mobile: 16px)
layout.grid-gap:          24px
layout.card-padding:      16px
layout.section-gap:       32px
```

---

## 4. Radius

| Token | Value | Use |
|---|---|---|
| `radius.none` | 0px | Table cells, chart bars |
| `radius.sm` | 4px | Inputs, small chips |
| `radius.md` | 6px | Default — buttons, cards, inputs, popovers |
| `radius.lg` | 8px | Larger panels (fundamentals, symbol header) |
| `radius.full` | 9999px | Risk badges, direction badges, pills |

---

## 5. Shadows

Minimal. Prefer `1px solid color.border` over shadows for static surfaces.

| Token | Value | Use |
|---|---|---|
| `shadow.none` | `none` | Cards, table, nav — use border instead |
| `shadow.card` | `0 1px 2px 0 rgba(15, 23, 42, 0.04)` | Optional card lift |
| `shadow.dropdown` | `0 4px 12px -2px rgba(15, 23, 42, 0.10), 0 0 0 1px rgba(15, 23, 42, 0.04)` | Popovers, menus, tooltips |

---

## 6. Component Specs

### 6.1 Nav Bar

```
height:            48px
background:        #10141C (color.surface)
border-bottom:     1px solid #1F2633 (color.border)
padding-x:         24px
position:          sticky, top: 0, z-index: 10

Logo: "stonks" wordmark — text.base, weight.semibold, color.foreground
Separator: 1px × 20px vertical, color.border, 16px margin each side
Nav links: text.sm, weight.medium
  Default:  color.muted-foreground
  Hover:    color.foreground, 150ms ease-out
  Active:   color.foreground + 2px underline (color.primary) flush to nav bottom
```

### 6.2 Primary Button

```
height:            40px
padding-x:         16px
background:        #34D399 (color.primary)
text:              #06251A, text.sm, weight.medium
radius:            6px (radius.md)
hover:             background #6EE7B7 (color.primary-hover)
active:            background #A7F3D0
transition:        background 150ms ease-out
focus-visible:     2px ring #34D399, 2px offset
```

### 6.3 Outline Button

```
height:            40px
padding-x:         16px
background:        transparent
text:              color.foreground, text.sm, weight.medium
border:            1px solid color.border
radius:            6px
hover:             background #171C26, border color.border-strong
transition:        150ms ease-out
```

### 6.4 Index Card

```
background:        #10141C
border:            1px solid #1F2633
radius:            6px
padding:           16px
gap (internal):    8px
hover:             border-color #2E3A4E, 150ms ease-out

Contents:
1. Symbol row: ticker (font.mono, text.sm, weight.medium, color.muted-foreground)
               + direction badge (right-aligned)
   Direction badge: radius.full, text.xs, weight.medium, px 8px py 4px
     Up:   bg #0C2B1F, text #3DDC97, glyph ▲
     Down: bg #2B1418, text #F87171, glyph ▼

2. Index name: text.sm, color.muted-foreground

3. Value: font.mono, text.xl, weight.semibold, color.foreground, tabular-nums

4. Delta: font.mono, text.sm, tabular-nums
          Up: color.delta-positive | Down: color.delta-negative
          Format: +X.XX (+Y.YY%) or −X.XX (−Y.YY%)
```

### 6.5 Fund Table Row

```
row-height:        ~48px (cell padding-y 12px, padding-x 16px)
border-bottom:     1px solid color.border
hover:             background color.muted, 150ms ease-out
header row:        background color.muted, text.xs, weight.medium, color.muted-foreground, uppercase

Cells:
- Fund name:   text.sm, color.foreground, weight.medium (line-clamp 2)
- Category:    text.xs, color.muted-foreground
- Risk badge:  radius.full, text.xs, weight.medium, px 8px py 2px
               Low:       bg #0C2B1F / text #4ADE80 / border #1E5C40
               Moderate:  bg #2A2410 / text #FACC15 / border #6B5D1A
               High:      bg #2B1B10 / text #FB923C / border #7C4A1E
               Very High: bg #2B1418 / text #F87171 / border #7F2A2E
- Returns:     font.mono, text.sm, tabular-nums, right-aligned
               Positive: color.delta-positive | Negative: color.delta-negative
               Always show sign (+/−)
- NAV:         font.mono, text.sm, tabular-nums, right-aligned, ₹ prefix
```

### 6.6 Symbol Header

```
container:         #10141C bg, 1px border #1F2633, radius 8px, padding 24px

Ticker:   font.mono, text.2xl (24px), weight.bold, color.foreground
Name:     font.sans, text.sm, color.muted-foreground, 4px below ticker
Price:    font.mono, text.3xl (30px), weight.semibold, color.foreground, tabular-nums, ₹ prefix

Delta badge (inline, beside price):
  radius.full, text.sm, weight.medium, px 8px py 4px, tabular-nums
  Up:   bg #0C2B1F, text #3DDC97, ▲ +X.XX (+Y.YY%)
  Down: bg #2B1418, text #F87171, ▼ −X.XX (−Y.YY%)

Volume: font.mono, text.xs, color.subtle, 4px below price row
```

### 6.7 EOD Chart

```
height:            160px plot area
bars:              30 bars, 2px gap, radius.none (no rounding)
bar fill:          Up: #3DDC97  |  Down: #F87171
bar min-height:    2px
baseline:          1px #1F2633 under bars
date labels:       text.xs, color.subtle, font.mono — left end (oldest) and right end (latest) only
hover per bar:     tooltip with shadow.dropdown — date + ₹close, font.mono
no axes, no gridlines, no Y-axis ticks
```

### 6.8 Fundamentals Grid

```
container:         #10141C bg, 1px border #1F2633, radius 8px, padding 24px

columns:           2-col at ≥640px (sm+), 1-col below
row:               label (left, text.sm, color.muted-foreground)
                   value (right, font.mono, text.sm, weight.medium, color.foreground, tabular-nums)
row-height:        ~44px, padding-y 12px
dividers:          1px color.border between rows, NOT below last row
units:             ₹ prefix for currency, % suffix for rates, × for ratios
```

---

## 7. Motion

```
duration.fast:   150ms
easing:          cubic-bezier(0.4, 0, 0.2, 1)  /* ease-out */

Allowed:    color, background-color, border-color transitions on hover/active/focus
Allowed:    opacity fade for dropdowns (150ms)
Forbidden:  translate/slide on hover, scale/bounce, spring physics, parallax, looping animation
```

`prefers-reduced-motion: reduce` → disable all non-essential transitions.

### 7.1 Data-reveal exception

Two additional one-shot, scroll-triggered motions are in use across the app —
carried over deliberately from a design pass and kept as a scoped exception to
the "no translate, no looping animation" rule above:

- **Scroll reveal** — `data-reveal` elements fade in + translateY(16px→0) once
  when they first enter the viewport (`useScrollReveal`).
- **Count-up** — `data-countup data-target="…"` numeric values animate from 0
  to their real target once, on first scroll-into-view (`useCountUp`). Targets
  are always real values (live index levels, real fund/portfolio figures) —
  never fabricated.

These are strictly one-shot (never loop, never re-trigger), respect
`prefers-reduced-motion: reduce` (skip straight to the end state), and exist
only for the "content arrives" moment — not for hover/interaction feedback,
which still follows the color/opacity-only rule above. Implemented in
`src/hooks/useScrollReveal.ts`, `useCountUp.ts` (composed via `useSxEffects.ts`).

---

## 8. Accessibility (WCAG 2.1 AA)

### Contrast

| Pair | Ratio | Status |
|---|---|---|
| foreground `#E7EDF4` on background `#0A0D13` | ~16.5:1 | AAA |
| foreground `#E7EDF4` on card `#10141C` | ~15.4:1 | AAA |
| muted-foreground `#8B98AC` on card `#10141C` | ~5.9:1 | AA |
| primary-foreground `#06251A` on primary `#34D399` | ~9.5:1 | AAA |
| delta-positive `#3DDC97` on card `#10141C` | ~9.7:1 | AAA |
| delta-negative `#F87171` on card `#10141C` | ~6.3:1 | AA |
| risk-moderate.fg `#FACC15` on `#2A2410` | ~9.6:1 | AAA |
| risk-high.fg `#FB923C` on `#2B1B10` | ~7.2:1 | AAA |
| subtle `#5C6A80` on background `#0A0D13` | ~3.5:1 | Large/decorative only — never body copy |

**Note:** the dark inversion materially improved delta and on-primary contrast vs the light system (both were AA-large-only; now AAA). `color.subtle` remains restricted to ≥14px decorative text. Always pair deltas with ▲/▼ glyph and +/− sign so meaning never relies on color alone.

### Focus

```
outline: 2px solid #34D399 (color.ring)
outline-offset: 2px
```

Applies to: buttons, links, inputs, interactive cards, nav links. Never `outline: none` without a full replacement ring.

### Touch Targets

- Primary controls: ≥ 40×40px
- Compact table affordances: ≥ 32px with adequate spacing
