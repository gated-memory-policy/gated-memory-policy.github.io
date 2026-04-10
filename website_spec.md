# Research Project Release Website — Implementation Specification

*Reflects the current clean academic design.*

`To launch locally: cd /Users/jinyun/Documents/mem_website && python3 -m http.server 8080. Then visit http://localhost:8080.`

---

## Design Philosophy

The site follows conventions of top-tier ML conference project pages (Nerfies, DreamFusion, etc.): white background, single muted blue accent, no animations, content-focused layout. Typography uses a serif/sans pairing for academic readability. All decorative elements (gradients, shadows, animations) have been removed in favor of clean lines and neutral colors.

---

## File Structure

```text
mem_website/
├── index.html          — all page content (pure HTML, no inline style/script)
├── style.css           — all visual styling
├── main.js             — tab switching + BibTeX copy (vanilla JS, ~80 lines)
└── assets/
    ├── videos/
    │   ├── teaser.mp4
    │   ├── attention_vis_cube_pushing.mp4
    │   ├── cross_trial/
    │   │   ├── pushing/
    │   │   │   ├── friction_0.015/ {ours.mp4, long_hist_dp.mp4, no_hist_dp.mp4}
    │   │   │   ├── friction_0.03/  {…}
    │   │   │   ├── friction_0.06/  {…}
    │   │   │   ├── friction_0.09/  {…}
    │   │   │   ├── friction_0.12/  {…}
    │   │   │   ├── friction_0.16/  {…}
    │   │   │   └── friction_0.2/   {…}
    │   │   ├── casting/
    │   │   │   ├── high_friction/  {ours.mp4, long_hist_dp.mp4, no_hist_dp.mp4}
    │   │   │   └── low_friction/   {…}
    │   │   └── flinging/
    │   │       ├── mass_low/       {…}
    │   │       ├── mass_mid_low/   {…}
    │   │       ├── mass_mid_high/  {…}
    │   │       └── mass_high/      {…}
    │   └── in_trial/
    │       ├── cup/
    │       │   ├── loc_A/ {ours.mp4, long_hist_dp.mp4, no_hist_dp.mp4}
    │       │   ├── loc_B/ {…}
    │       │   ├── loc_C/ {…}
    │       │   └── in_the_wild_ours.mp4
    │       ├── match_color/
    │       │   ├── attention_vis.mp4
    │       │   ├── loc_A/ {ours.mp4, long_hist_dp.mp4, no_hist_dp.mp4}
    │       │   ├── loc_B/ {…}
    │       │   ├── loc_C/ {…}
    │       │   └── loc_D/ {…}
    │       └── place_back/
    │           ├── loc_A/ {…}
    │           ├── loc_B/ {…}
    │           ├── loc_C/ {…}
    │           └── loc_D/ {…}
    ├── images/
    │   ├── architecture.png
    │   ├── gating_training.png
    │   └── cup_overlay/
    │       ├── loc_A/initial_pos.png
    │       ├── loc_B/initial_pos.png
    │       └── loc_C/initial_pos.png
    └── charts/
        ├── robomimic_bar_chart.png
        └── cross_trial/casting/
            ├── high_friction_bar_chart.png
            └── low_friction_bar_chart.png
```

---

## Design System

### Color Palette

| Token | Value | Usage |
| --- | --- | --- |
| `--bg` | `#ffffff` | Page background (white) |
| `--bg-alt` | `#f7f7f7` | Footer background |
| `--text` | `#1a1a1a` | Body and heading text |
| `--text-muted` | `#666666` | Captions, secondary text, section labels |
| `--accent` | `#2563eb` | Active tabs, links, corresponding-author marker |
| `--accent-rgb` | `37, 99, 235` | RGB form for `rgba()` usage |
| `--border` | `#e5e5e5` | Dividers, tab bar underline, placeholders |
| `--tab-active` | `var(--accent)` | Active tab text + underline (same as accent) |

Single-accent system: one blue is used for all interactive/emphasis elements. Section labels and config labels use `--text-muted` (gray), not the accent color.

### Typography

- **Headings** (`h1`–`h4`): `Noto Serif`, Georgia, serif. `h2`–`h3` weight-600.
- **Body / UI**: `Inter`, -apple-system, sans-serif, weight 400/500/600.
- **Font sizes**:
  - `h1` (paper title): `clamp(2rem, 5vw, 3.4rem)`, weight-600
  - `h2` (section headings): `clamp(1.85rem, 3.5vw, 2.4rem)`
  - `h3` (subsection headings): `1.5rem`
  - Body: `17px` / `1.75` line-height
  - Captions (`figcaption`): `0.845rem`, italic, `--text-muted`
  - Section labels: `0.72rem`, `0.14em` letter-spacing, uppercase, `--text-muted`
  - Tab buttons: `0.825rem`
  - Column headers: `0.75rem`, `--text-muted` (bold for "Ours")

### Spacing

- **Max content width**: `960px`, centered via `margin: 0 auto`
- **Section padding**: `72px` top/bottom, `24px` horizontal (collapses to `40px` on mobile)
- **Section dividers**: `1px solid var(--border)` between consecutive `.subsection` elements
- **Video grid gap**: `14px`
- **Video bleed**: `0px` — videos stay within the content column

---

## Global Layout Rules

- **Single-file HTML** with external `style.css` and `main.js`. No frameworks, no build step.
- All `<section>` tags: `width: 100%; max-width: 960px; margin: 0 auto;` — guarantees centering.
- No client-side routing. Page is top-to-bottom linear scroll.
- Only external network dependency: Google Fonts (`Noto Serif` + `Inter`) via `<link>` in `<head>`.
- **Responsive**: at `<= 640px`, all `.three-col` and `.four-col` grids collapse to single column.
- **No animations**: no keyframes, no bouncing elements, no gradient decorations.

---

## Placeholder Convention

When an asset is missing, render:

```html
<div class="placeholder-media">path/to/asset.mp4</div>
```

- Light background (`#fafafa`), subtle `1.5px` border (`#e5e5e5`)
- `aspect-ratio: 16/9` by default; add class `square` for `1/1`
- Centered play icon via CSS `::before` pseudo-element (SVG data URI)
- Chart placeholders: `.placeholder-media.square`
- Hero video: overridden to dark background (`#111`), no border

**To swap in a real asset:**

```html
<!-- video -->
<video autoplay loop muted playsinline>
  <source src="assets/videos/…" type="video/mp4">
</video>

<!-- image / chart -->
<img src="assets/images/…" alt="description">
```

---

## Tab System

### Design

All config-level selectors use a **horizontal underline tab bar** — no filled pill buttons.

- **Inactive**: muted text (`--text-muted`), `opacity: 0.55`
- **Hover**: full text color (`--text`), `opacity: 0.85`
- **Active**: accent blue text + `2px` bottom border (`--tab-active`)
- Tab bar has `border-bottom: 1px solid var(--border)` and `overflow-x: auto; scrollbar-width: none` for overflow cases (e.g. 7-tab pushing row)
- Active tab sits on top of bar border via `margin-bottom: -1px`

### HTML Contract

```html
<!-- Tab bar -->
<div class="tab-bar" role="tablist" data-tabgroup="GROUP_NAME">
  <button class="tab-btn active" data-tab="CONFIG_VALUE" role="tab">Label</button>
  <button class="tab-btn"        data-tab="CONFIG_VALUE" role="tab">Label</button>
</div>

<!-- Tab panels (one per config value) -->
<div class="tab-panel active" data-tabgroup="GROUP_NAME" data-config="CONFIG_VALUE">
  <!-- video grid content -->
</div>
<div class="tab-panel" data-tabgroup="GROUP_NAME" data-config="CONFIG_VALUE">
  …
</div>
```

**Key:** `button[data-tab]` value must exactly match the corresponding `div[data-config]` value. `data-tabgroup` must be unique per subsection.

### Tab Groups in Use

| `data-tabgroup` | Section | Config axis | # tabs |
| --- | --- | --- | --- |
| `pushing` | Cross-Trial Pushing | Friction coefficient | 7 |
| `casting` | Cross-Trial Casting | Friction regime | 2 |
| `flinging` | Cross-Trial Flinging | Cloth mass | 4 |
| `cup` | In-Trial Cup | Object location | 3 |
| `match-color` | In-Trial Match Color | Target location | 4 |
| `place-back` | In-Trial Place Back | Object location | 4 |

### JS Behavior (`main.js`)

On tab click:

1. Remove `.active` from all `.tab-btn` in the same `data-tabgroup`
2. Remove `.active` from all `.tab-panel` with the same `data-tabgroup`
3. Add `.active` to the clicked button
4. Add `.active` to `.tab-panel[data-tabgroup][data-config]` matching the clicked `data-tab`
5. Call `video.load()` + `video.play()` on any `<video>` inside the newly active panel (restores autoplay after `display:none`)

Additional JS features:

- **Video autoplay observer**: IntersectionObserver plays/pauses muted videos based on viewport visibility (30% threshold). Respects user interaction — once a user pauses/scrubs a video, auto-control stops for that video.
- **Sticky TOC nav**: Left-side navigation slides in after hero section leaves viewport, highlights current section via IntersectionObserver.
- **BibTeX copy**: Clipboard API with execCommand fallback, 2s "Copied!" feedback.

---

## Section-by-Section Specification

### Hero — Title Card (`#hero-title`)

- `background: var(--bg)` (white), no full-viewport height
- `padding: 80px 24px 60px`, centered flex column
- Paper title: `Noto Serif`, weight-600, `clamp(2rem, 5vw, 3.4rem)`, centered
- Tagline below with `<strong>` tags for emphasis (no colored underlines)
- Authors line + Institution line, `--text-muted`
- Three outline pill link buttons (Paper, arXiv, Code) — all same style, no filled primary button
  - Style: `1.5px` border, `border-radius: 100px`, hover inverts to dark fill

### Hero — Teaser Video (`#hero-video`)

- Inside `#intro-split` (stacked layout with abstract below)
- Video/iframe with `border-radius: 4px`, no box-shadow
- No controls shown. Attributes: `autoplay loop muted playsinline`
- Asset: `assets/videos/teaser.mp4`

### Abstract (`#abstract`)

- Inside `#intro-split`, below teaser video
- `font-size: 0.88rem`, `line-height: 1.72`, `color: var(--text-muted)`
- Section label in gray uppercase

### Model Architecture (`#architecture`)

- Section label: "Method" (gray uppercase)
- Full-width figure, `max-width: 600px`, centered via `.fig-centered`
- Asset: `assets/images/architecture.png`
- Explanatory paragraph below (`.body-text`)

### Attention Visualization (`#attention`)

- Section label: "Interpretability"
- Intro paragraph, centered video figure (`max-width: 720px`), follow-up paragraph
- Asset: `assets/videos/attention_vis_cube_pushing.mp4`

### Cross-Trial Memory (`#cross-trial`)

All three subsections use the tab system. Each `.tab-panel` contains:

1. `.row-caption.before` — context sentence
2. `.video-grid.three-col` (or `.four-col` for Casting) — one `.video-col` per policy
3. `.row-caption.after` — observation sentence

**Pushing** (`#cross-trial-pushing`): 7 tabs, friction axis. Three-column grid.

**Casting** (`#cross-trial-casting`): 2 tabs. Four-column grid: 3 videos + 1 bar chart.

**Flinging** (`#cross-trial-flinging`): 4 tabs, cloth mass axis. Three-column grid.

### In-Trial Memory (`#in-trial`)

**Cup** (`#in-trial-cup`): 3 tabs. Each tab panel includes a `<details class="overlay-details">` accordion for initial position images. Below all tabs: "In-the-Wild" block with single centered video (`max-width: 640px`).

**Match Color** (`#in-trial-match-color`): Two blocks:

1. **Attention visualization** (`.attention-block`) — always visible, `max-width: 720px`.
2. **Location tabs** — 4 tabs, standard three-column grid.

**Place Back** (`#in-trial-place-back`): 4 tabs. Standard three-column grid.

### Gating Training (`#gating-training`)

- Section label: "Method"
- Full-width figure (`max-width: 600px`). Asset: `assets/images/gating_training.png`
- Explanatory paragraph below

### Robomimic Benchmark (`#robomimic`)

- Section label: "Quantitative Results"
- Centered figure, `max-width: 600px`. Asset: `assets/charts/robomimic_bar_chart.png`
- Explanation paragraph below

### Team (`#team`)

- Centered grid of author cards (photo + name + affiliation)
- Author photos: `84px` circle, `1.5px` border, hover changes border to accent blue
- Corresponding author marked with superscript in accent color

### Footer (`#footer`)

- `background: var(--bg-alt)` (#f7f7f7), `border-top: 1px solid var(--border)`
- Citation block, BibTeX `<pre>` with dark background (`#1a1a1a`)
- Copy BibTeX button with Clipboard API + execCommand fallback
- Acknowledgements + copyright lines

---

## Component Reference

### `.video-grid`

```css
display: grid; width: 100%; gap: 14px;
/* .three-col → 1fr 1fr 1fr */
/* .four-col  → 1fr 1fr 1fr 1fr */
```

Collapses to single column at `<= 640px`.

### `.video-col`

Flex column containing: `.col-header` (label) then `<figure>` (video/placeholder + optional figcaption).

`.col-header.ours` uses `font-weight: 600` (bold) to distinguish our method. No color difference.

### `.tab-panel` / `.tab-btn`

`display: none` / `display: block` toggled by `main.js`. Initial active state set in HTML via `.active` class.

### `.overlay-details` (Cup)

Native `<details><summary>` element — zero JS. Summary has a CSS chevron that rotates 180deg when open. Opens a grid of square image placeholders.

### `.attention-block` (Match Color)

Always-visible figure block. `border-bottom: 1px solid var(--border)` separates it from the tab bar below. Max-width `720px`, centered.

### `.in-the-wild-block` (Cup)

Sub-block below all cup tabs. `border-top: 1px solid var(--border)`. Centered figure, `max-width: 640px`.

### `.fig-centered`

`max-width: 600px; margin: 0 auto 1rem;`. Used for architecture, gating, and robomimic figures.

### `.subsection-intro`

Plain text block for task descriptions. `color: var(--text-muted)`, `font-size: 0.88rem`, `max-width: 680px`. No background, no border decoration.

---

## Notes for Future Changes

### Adding a new friction/mass/location level

1. Add an `assets/videos/…/[new_config]/` folder with the three `.mp4` files
2. Add a new `<button class="tab-btn" data-tab="new_config">` to the relevant tab bar
3. Add a new `<div class="tab-panel" data-tabgroup="X" data-config="new_config">` with the video grid

### Changing the accent color

Edit `--accent` and `--accent-rgb` in `style.css` `:root` block (currently `#2563eb` / `37, 99, 235`). This single change propagates to tabs, links, TOC active state, and author markers.

### Replacing any placeholder with a real asset

Swap the `<div class="placeholder-media">` for `<video autoplay loop muted playsinline><source src="…" type="video/mp4"></video>` (or `<img src="…">` for images/charts) inside the same `<figure>` element.

### Collapsing a subsection into a dropdown (future UX)

The tab bar `.tab-btn`/`.tab-panel` pattern maps directly onto a `<select>` + JS `change` handler. Replace the `.tab-bar` with `<select data-tabgroup="X">` and wire `option[value]` to panel `data-config`.
