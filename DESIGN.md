# Stonks — DESIGN.md

Design system for **Stonks**, an Indian stock market research tool. Quiet, data-dense, professional. Light mode only. The aesthetic reference points are Linear, GitHub (light), and VS Code (light) — not a SaaS marketing site.

This file is the source of truth for `figma-cli import`. Token names are stable identifiers; do not rename.

---

## 0. Design Principles

- **Light mode only.** No dark mode, no dark cards, no dark surfaces. Background is always white or near-white.
- **One accent.** Emerald-600 (`#059669`) is the only brand color. It is used sparingly: primary CTA, active nav underline, positive financial delta, key highlights. Never as a background wash or decoration.
- **Color carries meaning.** Red = negative/destructive only. Amber/orange = risk badges only. Neither is ever decorative.
- **Borders over shadows.** Prefer a 1px border to a drop shadow for separating surfaces.
- **No gradients, no glassmorphism, no neon, no purple, no blue-500/indigo.**
- **Data-dense but breathable.** Tight enough to scan a table at a glance; loose enough not to feel cramped.

---

## 1. Color Tokens

Source values are authored in OKLCH for perceptual consistency; hex is provided for direct use and Figma import. Where the two differ trivially, hex is canonical for implementation.

### 1.1 Background & Surface

| Token | Hex | OKLCH | Usage |
|---|---|---|---|
| `color.background` | `#F8FAFC` | `oklch(0.984 0.003 247.858)` | App canvas / page background. Slate-50 off-white. |
| `color.surface` | `#FFFFFF` | `oklch(1 0 0)` | Raised surfaces above background: sticky nav, popovers, table container. |
| `color.card` | `#FFFFFF` | `oklch(1 0 0)` | Cards (index cards, fundamentals panel). Pure white, separated by `color.border`. |
| `color.muted` | `#F1F5F9` | `oklch(0.968 0.007 247.896)` | Muted fills: table header row, inactive tab, code/symbol chips, hover wells. |

### 1.2 Foreground / Text

| Token | Hex | OKLCH | Usage |
|---|---|---|---|
| `color.foreground` | `#0F172A` | `oklch(0.116 0.024 254.128)` | Primary text, headings, key values. Slate-900. |
| `color.muted-foreground` | `#64748B` | `oklch(0.446 0.03 256.802)` | Secondary text: labels, captions, table sub-text, fund category. Slate-500. |
| `color.subtle` | `#94A3B8` | `oklch(0.554 0.034 256.802)` | Tertiary: placeholders, disabled text, axis date labels, separators-as-text. Slate-400. |

### 1.3 Semantic / Interactive

| Token | Hex | OKLCH | Usage |
|---|---|---|---|
| `color.primary` | `#059669` | `oklch(0.596 0.145 163.225)` | Emerald-600. Primary button bg, active nav underline, focus ring, key highlight. |
| `color.primary-hover` | `#047857` | `oklch(0.527 0.131 162.5)` | Emerald-700. Primary button hover. |
| `color.primary-foreground` | `#FFFFFF` | `oklch(1 0 0)` | Text/icon on `color.primary`. |
| `color.primary-subtle` | `#ECFDF5` | `oklch(0.979 0.021 166.1)` | Emerald-50. Active/selected highlight backgrounds. Use rarely. |
| `color.destructive` | `#DC2626` | `oklch(0.577 0.245 27.325)` | Red-600. Destructive actions, error text, negative state. |
| `color.destructive-hover` | `#B91C1C` | `oklch(0.514 0.222 27.3)` | Red-700. Destructive button hover. |
| `color.border` | `#E2E8F0` | `oklch(0.929 0.013 255.508)` | Slate-200. Default border: cards, tables, dividers, inputs. |
| `color.border-strong` | `#CBD5E1` | `oklch(0.869 0.022 252.9)` | Slate-300. Emphasized border: input hover, focused table outline. |
| `color.input` | `#E2E8F0` | `oklch(0.929 0.013 255.508)` | Input border. |
| `color.ring` | `#059669` | `oklch(0.596 0.145 163.225)` | Focus ring (matches primary). |

### 1.4 Financial Semantic

| Token | Hex | Usage |
|---|---|---|
| `color.delta-positive` | `#059669` | Positive returns / up deltas. Numbers + ▲ glyph. tabular-nums. |
| `color.delta-positive-bg` | `#ECFDF5` | Tint behind up direction badge. |
| `color.delta-negative` | `#DC2626` | Negative returns / down deltas. Numbers + ▼ glyph. tabular-nums. |
| `color.delta-negative-bg` | `#FEF2F2` | Tint behind down direction badge. |
| `color.delta-neutral` | `#64748B` | Flat / 0.00% delta. |

### 1.5 Risk Badges

| Token | Hex | Usage |
|---|---|---|
| `color.risk-low.bg` | `#ECFDF5` | "Low" risk pill background. |
| `color.risk-low.fg` | `#047857` | "Low" risk pill text. |
| `color.risk-low.border` | `#A7F3D0` | "Low" risk pill border. |
| `color.risk-moderate.bg` | `#FEFCE8` | "Moderate" risk pill bg. |
| `color.risk-moderate.fg` | `#A16207` | "Moderate" risk pill text. |
| `color.risk-moderate.border` | `#FDE68A` | "Moderate" risk pill border. |
| `color.risk-high.bg` | `#FFF7ED` | "High" risk pill bg. |
| `color.risk-high.fg` | `#C2410C` | "High" risk pill text. |
| `color.risk-high.border` | `#FED7AA` | "High" risk pill border. |
| `color.risk-very-high.bg` | `#FEF2F2` | "Very High" risk pill bg. |
| `color.risk-very-high.fg` | `#B91C1C` | "Very High" risk pill text. |
| `color.risk-very-high.border` | `#FECACA` | "Very High" risk pill border. |

---

## 2. Typography

No custom web font. System stack only.

### 2.1 Font Families

```
font.sans:  system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
font.mono:  ui-monospace, "SF Mono", SFMono-Regular, "Cascadia Code", "Roboto Mono", Menlo, Consolas, "Liberation Mono", monospace
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
background:        #FFFFFF (color.surface)
border-bottom:     1px solid #E2E8F0 (color.border)
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
background:        #059669 (color.primary)
text:              #FFFFFF, text.sm, weight.medium
radius:            6px (radius.md)
hover:             background #047857 (color.primary-hover)
active:            background #036A4E
transition:        background 150ms ease-out
focus-visible:     2px ring #059669, 2px offset
```

### 6.3 Outline Button

```
height:            40px
padding-x:         16px
background:        transparent
text:              color.foreground, text.sm, weight.medium
border:            1px solid color.border
radius:            6px
hover:             background #F8FAFC, border color.border-strong
transition:        150ms ease-out
```

### 6.4 Index Card

```
background:        #FFFFFF
border:            1px solid #E2E8F0
radius:            6px
padding:           16px
gap (internal):    8px
hover:             border-color #CBD5E1, 150ms ease-out

Contents:
1. Symbol row: ticker (font.mono, text.sm, weight.medium, color.muted-foreground)
               + direction badge (right-aligned)
   Direction badge: radius.full, text.xs, weight.medium, px 8px py 4px
     Up:   bg #ECFDF5, text #059669, glyph ▲
     Down: bg #FEF2F2, text #DC2626, glyph ▼

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
               Low:       bg #ECFDF5 / text #047857 / border #A7F3D0
               Moderate:  bg #FEFCE8 / text #A16207 / border #FDE68A
               High:      bg #FFF7ED / text #C2410C / border #FED7AA
               Very High: bg #FEF2F2 / text #B91C1C / border #FECACA
- Returns:     font.mono, text.sm, tabular-nums, right-aligned
               Positive: color.delta-positive | Negative: color.delta-negative
               Always show sign (+/−)
- NAV:         font.mono, text.sm, tabular-nums, right-aligned, ₹ prefix
```

### 6.6 Symbol Header

```
container:         #FFFFFF bg, 1px border #E2E8F0, radius 8px, padding 24px

Ticker:   font.mono, text.2xl (24px), weight.bold, color.foreground
Name:     font.sans, text.sm, color.muted-foreground, 4px below ticker
Price:    font.mono, text.3xl (30px), weight.semibold, color.foreground, tabular-nums, ₹ prefix

Delta badge (inline, beside price):
  radius.full, text.sm, weight.medium, px 8px py 4px, tabular-nums
  Up:   bg #ECFDF5, text #059669, ▲ +X.XX (+Y.YY%)
  Down: bg #FEF2F2, text #DC2626, ▼ −X.XX (−Y.YY%)

Volume: font.mono, text.xs, color.subtle, 4px below price row
```

### 6.7 EOD Chart

```
height:            160px plot area
bars:              30 bars, 2px gap, radius.none (no rounding)
bar fill:          Up: #059669  |  Down: #DC2626
bar min-height:    2px
baseline:          1px #E2E8F0 under bars
date labels:       text.xs, color.subtle, font.mono — left end (oldest) and right end (latest) only
hover per bar:     tooltip with shadow.dropdown — date + ₹close, font.mono
no axes, no gridlines, no Y-axis ticks
```

### 6.8 Fundamentals Grid

```
container:         #FFFFFF bg, 1px border #E2E8F0, radius 8px, padding 24px

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

---

## 8. Accessibility (WCAG 2.1 AA)

### Contrast

| Pair | Ratio | Status |
|---|---|---|
| foreground `#0F172A` on background `#F8FAFC` | ~16.5:1 | AAA |
| foreground `#0F172A` on card `#FFFFFF` | ~17.4:1 | AAA |
| muted-foreground `#64748B` on `#FFFFFF` | ~4.8:1 | AA |
| primary-foreground `#FFFFFF` on primary `#059669` | ~3.9:1 | AA (UI/large) |
| delta-positive `#059669` on `#FFFFFF` | ~3.9:1 | AA (large/UI ≥14px medium) |
| delta-negative `#DC2626` on `#FFFFFF` | ~4.5:1 | AA |
| risk-moderate.fg `#A16207` on `#FEFCE8` | ~5.6:1 | AA |
| risk-high.fg `#C2410C` on `#FFF7ED` | ~5.2:1 | AA |

**Note:** delta-positive/primary clears AA only at large/UI sizes. Never use below 14px or weight < 500. Always pair with ▲/▼ glyph and +/− sign so meaning never relies on color alone.

### Focus

```
outline: 2px solid #059669 (color.ring)
outline-offset: 2px
```

Applies to: buttons, links, inputs, interactive cards, nav links. Never `outline: none` without a full replacement ring.

### Touch Targets

- Primary controls: ≥ 40×40px
- Compact table affordances: ≥ 32px with adequate spacing
