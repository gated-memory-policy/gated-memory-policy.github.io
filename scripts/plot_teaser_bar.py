"""
plot_teaser_bar.py
Generates the three-panel bar chart for the teaser figure (Fig. 1).
One SVG, three side-by-side sub-panels (Markovian / In-Trial / Cross-Trial),
each with 3 bars (No-history / Long-history / GMP).
The SVG sits underneath a row of three photos in the HTML composite; column
headers and row labels are handled in HTML, not here.

Usage:
    cd /path/to/mem_website/scripts
    python plot_teaser_bar.py

Output:
    ../assets/charts/teaser_bar_chart.svg
"""

import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

# ── Site palette ──────────────────────────────────────────────────────────────
BG         = "#faf7f0"   # site --bg
TEXT       = "#2a2218"
TEXT_MUTED = "#8a7a66"
BORDER     = "#e6d7bd"

# ── Method colors: match the site palette (warm beige ladder + accent) ──────
# Same convention as plot_success_rate.py / plot_robomimic.py: two muted
# warm beiges for the baselines, terracotta accent for GMP.
COLOR_NH   = "#d3c09d"   # No-history Policy: light warm beige
COLOR_LH   = "#9a8560"   # Long-history Policy: darker warm beige
COLOR_OURS = "#b5552a"   # GMP (ours): terracotta accent (site --accent)

# ── Data (from Fig. 1 of the paper) ───────────────────────────────────────────
PANELS = [
    ("Markovian",   [82, 42, 79]),
    ("In-Trial",    [10, 62.5, 85]),
    ("Cross-Trial", [5,  20,   95]),
]
METHODS = ["No-history Policy", "Long-history Policy", "GMP (ours)"]
COLORS  = [COLOR_NH, COLOR_LH, COLOR_OURS]

# ── Font settings ─────────────────────────────────────────────────────────────
# svg.fonttype="none" emits real <text> so the browser renders with its own
# font (Inter on the site). Matches plot_success_rate.py and plot_robomimic.py.
plt.rcParams.update({
    "font.family":        "sans-serif",
    "font.sans-serif":    ["Helvetica Neue", "Arial", "DejaVu Sans"],
    "axes.unicode_minus": False,
    "svg.fonttype":       "none",
})

# ── Layout ────────────────────────────────────────────────────────────────────
# No y-axis label or tick labels inside the SVG: the row label "Succ. Rate (%)"
# lives in HTML to the left, and each bar has its value printed on top.
# subplots_adjust pins left=right=0, so the three panels occupy equal thirds
# of the figure width and line up with the three photos above.
fig_w, fig_h = 8.4, 2.8
fig, axes = plt.subplots(
    1, 3,
    figsize=(fig_w, fig_h),
    sharey=True,
    gridspec_kw={"wspace": 0.08, "left": 0.005, "right": 0.995,
                 "top": 0.93, "bottom": 0.22},
)
fig.set_facecolor(BG)

bar_w = 0.58

for ax, (_label, values) in zip(axes, PANELS):
    ax.set_facecolor(BG)
    xs = np.arange(len(METHODS))
    for x, v, c in zip(xs, values, COLORS):
        is_ours = (c == COLOR_OURS)
        ax.bar(x, v, width=bar_w, color=c, linewidth=0, zorder=3)
        ax.text(
            x, v + 2.4,
            f"{v:g}",
            ha="center", va="bottom",
            fontsize=13,
            color=TEXT,
            fontweight="bold" if is_ours else "normal",
        )

    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_xlim(-0.55, len(METHODS) - 0.45)
    ax.set_ylim(0, 118)
    for spine in ["top", "right", "left"]:
        ax.spines[spine].set_visible(False)
    ax.spines["bottom"].set_color(BORDER)
    ax.spines["bottom"].set_linewidth(0.6)
    ax.tick_params(axis="both", length=0, pad=3)

# ── Legend at the bottom, centered ────────────────────────────────────────────
patches = [
    mpatches.Patch(facecolor=c, label=m, linewidth=0)
    for c, m in zip(COLORS, METHODS)
]
legend = fig.legend(
    handles=patches,
    loc="lower center",
    ncol=3,
    frameon=False,
    fontsize=11,
    bbox_to_anchor=(0.5, 0.0),
    handlelength=1.4,
    handleheight=0.85,
    handletextpad=0.5,
    columnspacing=2.0,
    labelcolor=TEXT,
)
for text, method in zip(legend.get_texts(), METHODS):
    if method == "GMP (ours)":
        text.set_color(COLOR_OURS)
        text.set_fontweight("bold")

# ── Save (no bbox_inches="tight" so panel thirds remain intact) ──────────────
script_dir = os.path.dirname(os.path.abspath(__file__))
charts_dir = os.path.abspath(os.path.join(script_dir, "..", "assets", "charts"))
out_path   = os.path.join(charts_dir, "teaser_bar_chart.svg")
fig.savefig(out_path, format="svg",
            facecolor=BG, transparent=False)
plt.close(fig)
print(f"Saved -> {out_path}")
