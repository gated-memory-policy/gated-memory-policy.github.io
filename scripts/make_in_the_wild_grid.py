"""
make_in_the_wild_grid.py
Tiles labeled iPhone trial videos (HEVC/HLG) into a single wide SDR grid for
the In-the-Wild section.

Filename labels (suffix after IMG_XXXX_):
    contains 'p'  -> perturbation trial
    contains 'f'  -> failed trial
    e.g. IMG_2161_p_f.MOV  = perturbation + fail

Grid (COLS x ROWS = 8 x 5):
    left  4 cols (20 cells) -> no-perturbation clips, sorted by filename
    right 4 cols (20 cells) -> perturbation clips, sorted by filename

Per-clip timeline:
    [0, nat_dur]              : clip plays, no tint
    [nat_dur, nat_dur+FADE_IN]: tint fades in (green = ok, red = fail)
    [nat_dur+FADE_IN, total]  : frozen last frame + peak tint
Total grid length = max(nat_dur across selected clips) + DIM_TAIL, so every
cell (including the longest) shows at least DIM_TAIL seconds of outcome tint.

Two-stage pipeline:
    Stage 1 (per input, cached):
        HEVC HLG -> Hable tonemap -> bt709 SDR -> scale to cell
                 -> clone-pad to total
                 -> overlay outcome tint (alpha fades in at nat_dur)
                 -> H.264 CRF 17 mezzanine

    Stage 2 (single):
        xstack 40 mezzanines in (no-pert | pert) row-major order
        -> H.264 CRF 23, fastdecode, faststart, no audio

Mezzanines cache in scripts/.mezz/; the cache key encodes cell size, fps,
total duration, fade/alpha, and success/fail so cells rebuild only when
something that affects their pixels changes. Delete scripts/.mezz/ to
force a full rebuild.

Usage:
    cd /path/to/mem_website/scripts
    python make_in_the_wild_grid.py
    # override any knob via env var, e.g.:
    CELL_W=320 CELL_H=180 CRF=20 python make_in_the_wild_grid.py
"""

import os
import re
import subprocess
import sys

# ── Config (override any via env var) ─────────────────────────────────────────
IN_DIR   = os.path.expanduser(os.environ.get("IN_DIR",  "~/Downloads/in-the-wild"))
OUT_REL  = os.environ.get("OUT_REL",
                          "assets/videos/in_trial/place_back_real/in_the_wild_ours.mp4")
COLS     = int(os.environ.get("COLS",    8))
ROWS     = int(os.environ.get("ROWS",    5))
CELL_W   = int(os.environ.get("CELL_W",  240))   # grid width  = COLS * CELL_W
CELL_H   = int(os.environ.get("CELL_H",  136))   # grid height = ROWS * CELL_H (must be even)
FPS      = int(os.environ.get("FPS",     30))
CRF      = int(os.environ.get("CRF",     20))    # final grid quality (lower = cleaner, bigger)
MEZZ_CRF = int(os.environ.get("MEZZ_CRF", 17))   # mezzanine (visually lossless at cell size)
PRESET   = os.environ.get("PRESET",      "slow") # slow squeezes ~15-20% more bits at same CRF

# Outcome tint timing
FADE_IN    = float(os.environ.get("FADE_IN",    0.30))
DIM_TAIL   = float(os.environ.get("DIM_TAIL",   0.80))  # min visible dim for longest clip
TINT_ALPHA = float(os.environ.get("TINT_ALPHA", 0.50))  # peak dim opacity
GREEN_HEX  = "0x4caf50"  # success
RED_HEX    = "0xf44336"  # failure

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT  = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
MEZZ_DIR   = os.path.join(SCRIPT_DIR, ".mezz")
OUT_PATH   = os.path.join(REPO_ROOT, OUT_REL)

assert COLS % 2 == 0, "COLS must be even so the no-pert / pert split is balanced."
HALF            = COLS // 2
NEEDED_PER_HALF = ROWS * HALF  # 20


def parse_labels(path: str):
    """Return (has_perturbation, has_fail) from IMG_XXXX_<suffix>.ext."""
    stem = os.path.splitext(os.path.basename(path))[0]
    m = re.match(r"^IMG_\d+(.*)$", stem)
    suffix = (m.group(1) if m else "").lower()
    return ("p" in suffix, "f" in suffix)


def probe_duration(path: str) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=duration", "-of",
         "default=noprint_wrappers=1:nokey=1", path],
        text=True,
    ).strip()
    return float(out)


def mezz_path(src: str, total_dur: float, has_f: bool) -> str:
    stem = os.path.splitext(os.path.basename(src))[0]
    tag  = (f"{CELL_W}x{CELL_H}_fps{FPS}"
            f"_tot{int(round(total_dur * 1000))}"
            f"_fi{int(round(FADE_IN * 1000))}"
            f"_a{int(round(TINT_ALPHA * 100))}"
            f"_{'f' if has_f else 's'}")
    return os.path.join(MEZZ_DIR, f"{stem}__{tag}.mp4")


def needs_build(src: str, dst: str) -> bool:
    return not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst)


def build_mezzanine(src: str, dst: str, nat_dur: float,
                    total_dur: float, has_f: bool) -> None:
    """Stage 1: one input -> one SDR mezzanine. Clip plays, freezes on its
    last frame, then an outcome tint fades in over FADE_IN and holds to
    total_dur."""
    color_hex = RED_HEX if has_f else GREEN_HEX
    src_chain = (
        "zscale=t=linear:npl=100,format=gbrpf32le,"
        "zscale=p=bt709,tonemap=tonemap=hable:desat=0,"
        "zscale=t=bt709:m=bt709:r=tv,format=yuv420p,"
        f"scale={CELL_W}:{CELL_H}:flags=bicubic,setsar=1,fps={FPS},"
        f"tpad=stop_mode=clone:stop_duration={total_dur},trim=0:{total_dur},"
        "setpts=PTS-STARTPTS"
    )
    # Tint is a solid-color source whose alpha is scaled to TINT_ALPHA and
    # then fades in from 0 starting at nat_dur. Overlay composites it over
    # the clip's frozen tail.
    fc = (
        f"[0:v]{src_chain}[v];"
        f"color=c={color_hex}:s={CELL_W}x{CELL_H}:d={total_dur}:r={FPS},"
        f"format=yuva420p,colorchannelmixer=aa={TINT_ALPHA},"
        f"fade=t=in:st={nat_dur}:d={FADE_IN}:alpha=1[tint];"
        f"[v][tint]overlay=format=auto:shortest=0[out]"
    )
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-i", src, "-filter_complex", fc, "-map", "[out]", "-an",
         "-c:v", "libx264", "-crf", str(MEZZ_CRF), "-preset", PRESET,
         "-pix_fmt", "yuv420p", dst],
        check=True,
    )


def build_grid(mezzanines: list[str]) -> None:
    """Stage 2: xstack N mezzanines into the final grid."""
    if (CELL_H * ROWS) % 2 or (CELL_W * COLS) % 2:
        sys.exit(f"Grid {CELL_W*COLS}x{CELL_H*ROWS} has odd dimension; libx264 needs even.")

    layout = "|".join(f"{c*CELL_W}_{r*CELL_H}" for r in range(ROWS) for c in range(COLS))
    fc = (
        "".join(f"[{i}:v]" for i in range(len(mezzanines)))
        + f"xstack=inputs={len(mezzanines)}:layout={layout}[out]"
    )
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    # -tune fastdecode:   lower decoder cost in the browser, smoother playback
    # -g FPS:             keyframe every second so <video loop> restarts fast
    # -profile:v main:    broadly GPU-accelerated across browsers
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-y"]
        + [arg for m in mezzanines for arg in ("-i", m)]
        + ["-filter_complex", fc, "-map", "[out]",
           "-c:v", "libx264", "-crf", str(CRF), "-preset", PRESET,
           "-tune", "fastdecode", "-profile:v", "main", "-g", str(FPS),
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
           OUT_PATH],
        check=True,
    )


if __name__ == "__main__":
    all_files = sorted(os.path.join(IN_DIR, f) for f in os.listdir(IN_DIR)
                       if f.lower().endswith((".mov", ".mp4", ".m4v")))

    no_pert, pert = [], []
    for f in all_files:
        (pert if parse_labels(f)[0] else no_pert).append(f)

    print(f"Found {len(all_files)} clips in {IN_DIR} "
          f"({len(no_pert)} no-perturbation, {len(pert)} perturbation).")
    if len(no_pert) < NEEDED_PER_HALF:
        sys.exit(f"Need {NEEDED_PER_HALF} no-perturbation clips, found {len(no_pert)}.")
    if len(pert) < NEEDED_PER_HALF:
        sys.exit(f"Need {NEEDED_PER_HALF} perturbation clips, found {len(pert)}.")
    no_pert = no_pert[:NEEDED_PER_HALF]
    pert    = pert[:NEEDED_PER_HALF]

    # Row-major grid order: for each row, 4 no-pert (left) then 4 pert (right).
    ordered: list[str] = []
    for r in range(ROWS):
        ordered.extend(no_pert[r*HALF : (r+1)*HALF])
        ordered.extend(pert[r*HALF    : (r+1)*HALF])

    durations = {src: probe_duration(src) for src in ordered}
    max_dur   = max(durations.values())
    total_dur = max_dur + DIM_TAIL
    print(f"Max clip duration {max_dur:.2f}s -> grid duration {total_dur:.2f}s "
          f"(incl. {DIM_TAIL:.2f}s minimum dim tail).")

    os.makedirs(MEZZ_DIR, exist_ok=True)
    mezzanines = []
    for i, src in enumerate(ordered, 1):
        has_f = parse_labels(src)[1]
        dst   = mezz_path(src, total_dur, has_f)
        tag   = "fail" if has_f else "ok"
        if needs_build(src, dst):
            print(f"  [{i:>2}/{len(ordered)}] mezzanine  {os.path.basename(src)}  ({tag})")
            build_mezzanine(src, dst, durations[src], total_dur, has_f)
        else:
            print(f"  [{i:>2}/{len(ordered)}] cached     {os.path.basename(src)}  ({tag})")
        mezzanines.append(dst)

    print(f"Stacking {len(mezzanines)} cells -> {COLS*CELL_W}x{ROWS*CELL_H} grid, CRF {CRF}")
    build_grid(mezzanines)
    print(f"Wrote {OUT_PATH}")
