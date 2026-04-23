# Gated Memory Policy website spec

Single-page research site for the Gated Memory Policy (GMP) paper. Plain HTML, CSS, JS — no build step.

## Quick start

```bash
cd /Users/jinyun/Documents/mem_website
python3 -m http.server 8080
# visit http://localhost:8080
```

## File map

```text
mem_website/
  index.html          all page content
  style.css           all visual styling
  main.js             tab switching, video preload, details hash deep-link, TOC, BibTeX
  website_spec.md     this file
  scripts/            python chart generators (plot_teaser_bar.py,
                      plot_success_rate.py, plot_robomimic.py,
                      make_in_the_wild_grid.py)
  paper/              dated paper PDFs (the latest one is linked from the Paper button)
  assets/
    favicon.png
    images/           team headshots, architecture/gating SVGs, hf-logo.svg,
                      arxiv-logomark.svg, pos_overlay.png, teaser/*.svg
    charts/           SVG bar charts (output of scripts/plot_*.py)
    videos/           teaser + cross_trial/ + in_trial/ + attention_vis_*.mp4
```

## Design system

All tokens live at the top of `style.css` under `:root`. Changing them propagates site-wide.

### Palette (warm cream, academic press feel)

| Token           | Value                       | Role                                     |
| --------------- | --------------------------- | ---------------------------------------- |
| `--bg`          | `#faf7f0`                   | main page background                     |
| `--bg-alt`      | `#f2ece0`                   | footer background                        |
| `--surface`     | `#fdfbf6`                   | elevated card surface                    |
| `--surface-hi`  | `#fffefa`                   | hover surface                            |
| `--text`        | `#1a1612`                   | body and heading text                    |
| `--text-soft`   | `#3a3328`                   | secondary text                           |
| `--text-muted`  | `#78695a`                   | captions, eyebrows, inactive tab labels  |
| `--text-faint`  | `#b2a390`                   | very low emphasis                        |
| `--accent`      | `#b5552a`                   | active tab, link, corresponding author † |
| `--accent-rgb`  | `181, 85, 42`               | rgba() form of accent                    |
| `--accent-soft` | `rgba(181, 85, 42, 0.09)`   | subtle accent wash                       |
| `--accent-line` | `rgba(181, 85, 42, 0.28)`   | accent hairline                          |
| `--border`      | `rgba(60, 45, 25, 0.13)`    | default divider                          |
| `--border-hi`   | `rgba(60, 45, 25, 0.22)`    | emphasized divider                       |
| `--hairline`    | `rgba(60, 45, 25, 0.06)`    | faintest rule                            |

### Typography

- Body and UI: `Inter` via Google Fonts. Weights 300 to 800.
- Code/monospace accents: `JetBrains Mono` (tab numerics, BibTeX, etc.).
- OpenType features enabled: `ss01`, `cv11`, `cv05`, `kern`, `liga`, `calt`.
- Headings use the Inter stack at weight 600 with tighter line height.
- Body base size: `17px`, line height `1.7`.

### Layout

- Unified content column: `--max-w: 808px` with `--pad-x: 24px` gives a **760px** effective reading column. One column width for body, captions, subsections — no dual body/section split.
- Wide elements (teaser figure, taxonomy grid, full-bleed grids) extrude past the column via:

  ```css
  width: calc(100vw - 40px);
  max-width: <cap>;  /* e.g. 900px or 1080px */
  margin-left: 50%;
  transform: translateX(-50%);
  position: relative;
  ```

- Major top-level sections share compact chapter padding of `32px` top/bottom — the page reads as one continuous blog, not chapter-separated viewports. Two pairs share a single viewport and use collapsed gaps: `#method + #design` and `#team + #acknowledgments`.
- Only network dependency: Google Fonts.

### Motion

- Scrolling uses the browser default. No snap, no hijacking.
- Each top-level section slides up and fades in when it enters the viewport (`.section-reveal` in `style.css`). `prefers-reduced-motion` disables it.
- Tab underline slides in via `transform: scaleX`.
- Link hover shows a sliding arrow indicator.

## Section inventory

Rendered in this order inside `index.html`:

| id                 | Title                     | Notes                                                                        |
| ------------------ | ------------------------- | ---------------------------------------------------------------------------- |
| `#post-header`     | Compact document header   | Title, authors, institution + pub-meta row, 5 link buttons                   |
| `#overview`        | Opening narrative         | 5 body-text paragraphs; teaser figure between P1 and P2                      |
| `#taxonomy`        | Memory regimes            | 3 square cards linked to APA/ScienceDirect psychology definitions            |
| `#method`          | Method                    | Architecture + Gating Mechanism, caption-above-figure single column          |
| `#design`          | Design Choices            | Gate calibration, cross-attention over per-frame tokens, noise augmentation  |
| `#memmimic`        | MemMimic benchmark        | Umbrella for the `in-trial-*` and `cross-trial-*` subsections (see below)    |
| `#in-the-wild`     | Outdoor generalization    | Full-bleed grid of 40 outdoor trials, with and without human perturbation    |
| `#attention`       | Causal attention behavior | Tabs for cube pushing and match color                                        |
| `#benchmark`       | Other benchmarks          | Robomimic + MIKASA-Robo                                                      |
| `#whats-next`      | What's Next               | Two paragraphs grounded in paper §V limitations                              |
| `#faq`             | FAQ                       | `<details>` accordion; `#faq-memory-duration` is the deep-link target        |
| `#team`            | Team                      | Author grid                                                                  |
| `#acknowledgments` | Acknowledgments           | Full-width prose; the soft CTA block sits below                              |

`#memmimic` subsection ids (in render order):

- `#in-trial-place-back-real`, `#in-trial-match-color`, `#in-trial-place-back` — Continuous Place Back Real is intentionally first.
- `#cross-trial-casting`, `#cross-trial-pushing`, `#cross-trial-flinging`.

## HTML contracts used by JS

`main.js` reads the following DOM shapes. Keep them intact when editing content.

### Tab system

```html
<div class="tab-bar" role="tablist" data-tabgroup="GROUP">
  <button class="tab-btn active" data-tab="VALUE" role="tab">Label</button>
  <button class="tab-btn"        data-tab="VALUE2" role="tab">Label 2</button>
</div>

<div class="tab-panel active" data-tabgroup="GROUP" data-config="VALUE">... </div>
<div class="tab-panel"        data-tabgroup="GROUP" data-config="VALUE2">...</div>
```

`data-tab` on a button must match `data-config` on exactly one panel in the same `data-tabgroup`. `data-tabgroup` must be unique per subsection.

Tab groups currently in use:

| tabgroup          | Section                                | Axis                  | tabs |
| ----------------- | -------------------------------------- | --------------------- | ---- |
| `pushing`         | Cross-Trial Pushing                    | friction coefficient  | 6    |
| `casting`         | Cross-Trial Casting                    | friction regime       | 2    |
| `flinging`        | Cross-Trial Flinging                   | cloth mass            | 7    |
| `place-back-real` | In-Trial Continuous Place Back (Real)  | object location       | 5    |
| `match-color`     | In-Trial Match Color                   | target location       | 4    |
| `place-back`      | In-Trial Place Back (Sim)              | object location       | 4    |
| `attn-vis`        | Attention Visualization                | task                  | 2    |

### Videos

- All comparison clips: `<video autoplay loop muted playsinline preload="none">`, no `controls`.
- The 2 attention visualization clips keep `controls` so the reader can scrub.
- Every `<video>` lives inside a `<figure>`. The global rule `figure video { width: 100%; border-radius: 6px; display: block }` handles sizing; no inline style needed.
- A video that must play at non-1× speed uses `data-playbackrate="<rate>"`, applied by `applyRates()` in `main.js`.

### Sticky TOC

```html
<nav id="toc-nav">
  <div class="toc-inner">
    <a class="toc-link" href="#section-id">
      <span class="toc-link-title">Label</span>
      <span class="toc-link-desc">optional subtitle</span>
    </a>
  </div>
</nav>
```

JS adds `.visible` to `#toc-nav` after the post header leaves view, and `.active` to the link whose section is currently in the upper portion of the viewport.

### FAQ deep links

FAQ items use `<details id="faq-*">`. `openHashedDetails()` in `main.js` auto-opens the matching `<details>` on initial load and on `hashchange`, so links like `#faq-memory-duration` land with the item already expanded.

### Footnote tooltips

`<a class="fn-ref" data-fn="Paper &middot; §III.B">1</a>` renders the small superscript number. CSS pseudo-elements on `.fn-ref::before` / `::after` draw an arrow + pill tooltip on hover, showing the `data-fn` string. The `href` takes the user to the source (paper PDF or external URL).

### BibTeX copy

```html
<pre><code id="bibtex-content">...</code></pre>
<button class="copy-btn" onclick="copyBibtex(this)">Copy BibTeX</button>
```

## JS architecture

`main.js` is organized into independent blocks:

### 1. Tab switching

Generic handler attached per `.tab-bar`. On click it removes `.active` from sibling buttons and panels in the same tabgroup, activates the clicked one, and calls `video.load()` on videos inside the newly shown panel so autoplay resumes after `display:none`.

### 2. Video preload + playback (three-layer)

Goal: user never sees a buffering spinner; Chrome's decoder pool is never flooded.

- **Intent layer**. Videos are sorted in DOM order. A frontier advances so that `AHEAD` (15) videos ahead of the near viewport edge are queued. Visibility and tab click events can promote videos to the front of the queue.
- **Prefetch layer**. A FIFO queue drained during browser idle time (`requestIdleCallback` with a 1500ms timeout fallback). Concurrency capped at `MAX_INFLIGHT` (4) with `canplay` / `loadeddata` / `error` freeing a slot. `fetchPriority` is `high` for videos laid out within 1.2× the viewport height at boot ("hot start") and `low` for everything else.
- **Playback layer**. `IntersectionObserver` at `threshold: 0.25` plays visible videos and pauses them when they leave. Scrolling back to a previously seen video auto-resumes it.

Save-Data and 2G connections downshift to `AHEAD=2, MAX_INFLIGHT=2`.

### 3. Details auto-play + hash open

Videos inside a closed `<details>` never fire `IntersectionObserver`. `wireDetails()` listens for `toggle` and starts playback when a `<details>` opens. `openHashedDetails()` opens the target when the URL hash points at a `<details id>`, both on load and on `hashchange`.

### 4. Playback-rate overrides

`applyRates()` scans `[data-playbackrate]` videos and sets `video.playbackRate` on `loadedmetadata` and `play`.

### 5. Section slide-in

One `IntersectionObserver` watches each top-level section. When a section enters the viewport (`threshold: 0.04`), `.is-visible` is added and the whole section slides up ~90px and fades in. Fires once per section. Sections already in the viewport on load are not animated.

### 6. Sticky TOC nav

Visible from the first content section through to just before the footer. Uses a scroll listener (passive) plus an `IntersectionObserver` (rootMargin `-15% 0 -75% 0`) to highlight the current section.

### 7. BibTeX copy

Clipboard API with an `execCommand` fallback. Button shows "Copied!" for 2 seconds.

## Maintenance how-tos

### Bump the "Updated" date

Edit the `<time datetime="…">` inside `#post-header .pub-meta` in `index.html`. Keep the `datetime` attribute in `YYYY-MM-DD` form.

### Swap the latest paper PDF

1. Drop the new PDF under `paper/` with a dated filename.
2. Update the `href` on the Paper button and on the two paper-PDF footnote `<a>` tags in `#overview` and `#design`.

### Add a new tab within a subsection

1. Drop the mp4 files under `assets/videos/.../[new_config]/`.
2. Add a new `<button class="tab-btn" data-tab="new_config">` to the tab bar.
3. Add a matching `<div class="tab-panel" data-tabgroup="X" data-config="new_config">` with the video grid.

### Change the accent color

Edit `--accent` and `--accent-rgb` under `:root` in `style.css`. Tabs, links, author marker, focus ring, teaser letter, and highlight wash update together. Rerun the chart generators so chart SVGs match.

### Regenerate charts

```bash
cd /Users/jinyun/Documents/mem_website/scripts
python plot_teaser_bar.py        # (orphan at present — teaser uses text descriptions)
python plot_success_rate.py      # per-task success-rate bars + MIKASA benchmark
python plot_robomimic.py         # Robomimic grouped bar chart
python make_in_the_wild_grid.py  # 8×5 grid of 40 outdoor trials (in-the-wild)
```

Each script uses the site palette tokens defined at the top of the file and sets `svg.fonttype="none"` so the browser renders chart labels in Inter.

### Hide a section

Comment the section out or remove it. Also remove its `.toc-link` entry in `#toc-nav`. Nothing else is wired.

### Add a new top-level section

1. Add `<section id="new-section">...</section>` in the desired DOM order.
2. Add a `.toc-link` to `#toc-nav`.
3. If it should get the compact chapter padding, append `#new-section` to the MAJOR SECTIONS selector list in `style.css`.
