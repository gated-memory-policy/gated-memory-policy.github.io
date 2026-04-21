"""
plot_robomimic.py
Recreates the RoboMimic grouped bar chart in the site's style.

Usage:
    cd /path/to/mem_website/assets/charts
    python plot_robomimic.py

Output:
    robomimic_bar_chart_new.svg
"""

import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

# ── Site palette (warm cream/beige — matches plot_success_rate.py) ──────────
BG         = "#faf7f0"   # matches site --bg (main page background)
TEXT       = "#2a2218"   # warm near-black
TEXT_MUTED = "#8a7a66"   # warm brown-gray
ACCENT     = "#b5552a"   # warm terracotta — matches site --accent
BORDER     = "#e6d7bd"

# ── Method colors — warm beige gradient, ACCENT terracotta for ours ──────────
METHOD_COLORS = [
    "#e3d4b8",   # No-hist DP    – lightest warm beige
    "#d3c09d",   # Mid-hist DP
    "#b9a37c",   # Mid-hist PTP
    "#9a8560",   # Long-hist DP
    "#7a6545",   # Long-hist PTP – darkest warm brown
    ACCENT,      # GMP (ours)    – warm terracotta
]

METHODS = [
    "No-hist DP",
    "Mid-hist DP",
    "Mid-hist PTP",
    "Long-hist DP",
    "Long-hist PTP",
    "GMP (ours)",
]

# ── Data (read off the original chart) ────────────────────────────────────────
# Rows = tasks, columns = methods in order above
TASKS = [
    "Tool Hang\n(ph)",
    "Transport\n(ph)",
    "Transport\n(mh)",
    "Square\n(ph)",
    "Square\n(mh)",
]

DATA = [
    #  nh    mh-DP  mh-PTP  lh-DP  lh-PTP  GMP
    [  83,    85,    84,     43,    28,     81 ],  # Tool Hang (ph)
    [  95,    98,   100,     89,    90,     88 ],  # Transport (ph)
    [  71,    80,    86,     58,    55,     68 ],  # Transport (mh)
    [  99,    97,    95,     86,    90,     98 ],  # Square (ph)
    [  90,    86,    87,     69,    65,     88 ],  # Square (mh)
]

# ── Global font settings (matches plot_success_rate.py) ───────────────────────
plt.rcParams.update({
    "font.family":        "sans-serif",
    "font.sans-serif":    ["Helvetica Neue", "Arial", "DejaVu Sans"],
    "axes.unicode_minus": False,
})

# ── Layout ────────────────────────────────────────────────────────────────────
n_tasks   = len(TASKS)
n_methods = len(METHODS)

bar_w     = 0.11          # width of each individual bar
group_gap = 0.18          # extra gap between task groups
group_w   = n_methods * bar_w + group_gap

fig_w = 13.0
fig_h = 2.4

fig, ax = plt.subplots(figsize=(fig_w, fig_h))
fig.set_facecolor(BG)
ax.set_facecolor(BG)

# ── Draw bars ─────────────────────────────────────────────────────────────────
group_centers = []
for g, (task, row) in enumerate(zip(TASKS, DATA)):
    group_left = g * group_w
    offsets = np.arange(n_methods) * bar_w
    center  = group_left + offsets.mean()
    group_centers.append(center)

    for m, (val, color) in enumerate(zip(row, METHOD_COLORS)):
        x = group_left + offsets[m]
        bar = ax.bar(x, val, width=bar_w * 0.88, color=color,
                     zorder=3, linewidth=0)

        # value label above bar
        is_ours = (m == n_methods - 1)
        ax.text(
            x, val + 1.2,
            str(val),
            ha="center", va="bottom",
            fontsize=11,
            color=ACCENT if is_ours else TEXT_MUTED,
            fontweight="bold" if is_ours else "normal",
        )

# ── Axes ──────────────────────────────────────────────────────────────────────
ax.set_xlim(-bar_w, (n_tasks - 1) * group_w + n_methods * bar_w + bar_w)
ax.set_ylim(0, 118)
ax.set_yticks([0, 50, 100])
ax.set_yticklabels(["0", "50", "100"], fontsize=14, color=TEXT_MUTED)

ax.set_xticks(group_centers)
ax.set_xticklabels(TASKS, fontsize=14.5, color=TEXT, linespacing=1.3)

ax.set_ylabel("Success Rate (%)", fontsize=13, color=TEXT_MUTED, labelpad=5)

# ── Grid, spines, ticks (matches plot_success_rate.py) ────────────────────────
ax.yaxis.grid(True, color=BORDER, linewidth=0.45, zorder=0)
ax.set_axisbelow(True)
for spine in ["top", "right", "left"]:
    ax.spines[spine].set_visible(False)
ax.spines["bottom"].set_color(BORDER)
ax.spines["bottom"].set_linewidth(0.6)
ax.tick_params(axis="both", length=0, pad=3)

# ── Legend ────────────────────────────────────────────────────────────────────
patches = []
for method, color in zip(METHODS, METHOD_COLORS):
    is_ours = method == "GMP (ours)"
    patch = mpatches.Patch(
        facecolor=color,
        label=method,
        linewidth=0,
    )
    patches.append(patch)

legend = ax.legend(
    handles=patches,
    loc="upper center",
    bbox_to_anchor=(0.5, -0.30),
    ncol=n_methods,
    frameon=False,
    fontsize=10.5,
    handlelength=1.4,
    handleheight=0.85,
    handletextpad=0.5,
    columnspacing=1.0,
    labelcolor=TEXT,
)
# Bold the "GMP (ours)" legend label
for text, method in zip(legend.get_texts(), METHODS):
    if method == "GMP (ours)":
        text.set_color(ACCENT)
        text.set_fontweight("bold")

# ── Save ──────────────────────────────────────────────────────────────────────
out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "robomimic_bar_chart_new.svg")
plt.tight_layout(pad=0.3)
fig.savefig(out_path, format="svg", bbox_inches="tight",
            facecolor=BG, transparent=False)
plt.close(fig)
print(f"Saved → {out_path}")
