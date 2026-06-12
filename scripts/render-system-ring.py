#!/usr/bin/env python3
"""Render BLACKANDBREW ERP system structure as a full-screen community ring diagram."""

import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.collections import LineCollection
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "graphify-out/.ring_data.json").read_text(encoding="utf-8"))
OUT = ROOT / "graphify-out/system-ring-diagram.png"

communities = DATA["communities"]
edges = DATA["edges"]
stats = DATA["stats"]

# Sort communities by size (largest first) for visual prominence on ring
sorted_comms = sorted(communities, key=lambda c: -c["size"])
n = len(sorted_comms)
id_to_idx = {c["id"]: i for i, c in enumerate(sorted_comms)}

# Ring positions — communities arranged clockwise by size
angles = np.linspace(0, 2 * math.pi, n, endpoint=False)
radius = 1.0
positions = {
    c["id"]: (radius * math.cos(a - math.pi / 2), radius * math.sin(a - math.pi / 2))
    for c, a in zip(sorted_comms, angles)
}

# Pastel palette (minimalist, per project standards)
PALETTE = [
    "#B5EAD7", "#C7CEEA", "#FFDAC1", "#E2F0CB", "#FFB7B2",
    "#B5D8EB", "#F8EDEB", "#D4E4BC", "#FDE2E4", "#E8DFF5",
    "#DAEAF6", "#FFF1C1", "#D5E8D4", "#F5C6D6", "#C9E4DE",
]

fig = plt.figure(figsize=(24, 24), facecolor="#0f0f1a")
ax = fig.add_axes([0, 0, 1, 1])
ax.set_facecolor("#0f0f1a")
ax.set_aspect("equal")
ax.axis("off")

# Draw inter-community chords (weighted)
max_w = max((e["weight"] for e in edges), default=1)
for e in edges:
    if e["source"] not in positions or e["target"] not in positions:
        continue
    p1 = positions[e["source"]]
    p2 = positions[e["target"]]
    alpha = 0.08 + 0.35 * (e["weight"] / max_w)
    lw = 0.3 + 2.5 * (e["weight"] / max_w)
    ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color="#6366f1", alpha=alpha, linewidth=lw, zorder=1)

# Outer guide ring
circle = plt.Circle((0, 0), radius, fill=False, color="#2a2a4e", linewidth=2, linestyle="--", alpha=0.5)
ax.add_patch(circle)

# Community nodes on ring
sizes = np.array([c["size"] for c in sorted_comms])
size_norm = 40 + 280 * (sizes - sizes.min()) / max(sizes.max() - sizes.min(), 1)

for i, c in enumerate(sorted_comms):
    x, y = positions[c["id"]]
    color = PALETTE[i % len(PALETTE)]
    ax.scatter(
        x, y,
        s=size_norm[i],
        c=color,
        edgecolors="#1a1a2e",
        linewidths=1.2,
        zorder=3,
        alpha=0.95,
    )

# Labels for larger communities only (size >= 15) to avoid clutter
for c in sorted_comms:
    if c["size"] < 15:
        continue
    x, y = positions[c["id"]]
    # Position label outward from center
    dist = math.hypot(x, y) or 1
    lx = x / dist * 1.18
    ly = y / dist * 1.18
    ha = "left" if x > 0.05 else ("right" if x < -0.05 else "center")
    short = c["label"].replace("C", "").split(": ", 1)[-1][:22]
    ax.text(
        lx, ly, short,
        fontsize=7, color="#e0e0e0", ha=ha, va="center",
        rotation=0, zorder=4,
        bbox=dict(boxstyle="round,pad=0.15", facecolor="#1a1a2e", edgecolor="none", alpha=0.7),
    )

# Center hub — god nodes / system core
ax.add_patch(plt.Circle((0, 0), 0.22, color="#1a1a2e", zorder=5))
ax.add_patch(plt.Circle((0, 0), 0.22, fill=False, edgecolor="#4E79A7", linewidth=2, zorder=6))
ax.text(0, 0.06, "BLACKANDBREW ERP", ha="center", va="center", fontsize=16, fontweight="bold", color="#ffffff", zorder=7)
ax.text(0, -0.02, f"{stats['nodes']} nodes · {stats['edges']} edges", ha="center", va="center", fontsize=10, color="#aaa", zorder=7)
ax.text(0, -0.09, f"{stats['communities']} communities", ha="center", va="center", fontsize=10, color="#aaa", zorder=7)
ax.text(0, -0.16, "cn() · assertWritableSession() · getMarketInsights()", ha="center", va="center", fontsize=7.5, color="#76B7B2", zorder=7)

# Title
fig.text(0.5, 0.97, "System Architecture — Community Ring Map", ha="center", fontsize=22, color="#ffffff", fontweight="bold")
fig.text(0.5, 0.945, "graphify knowledge graph · full structure overview", ha="center", fontsize=11, color="#888")

# Legend — top 12 communities
legend_items = []
for i, c in enumerate(sorted_comms[:12]):
    color = PALETTE[i % len(PALETTE)]
    short = c["label"].split(": ", 1)[-1][:20]
    legend_items.append(mpatches.Patch(color=color, label=f"{short} ({c['size']})"))
ax.legend(
    handles=legend_items,
    loc="lower left",
    fontsize=7,
    framealpha=0.85,
    facecolor="#1a1a2e",
    edgecolor="#2a2a4e",
    labelcolor="#ccc",
    title="Top Communities",
    title_fontsize=8,
)

ax.set_xlim(-1.55, 1.55)
ax.set_ylim(-1.55, 1.55)

OUT.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(OUT, dpi=150, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0.1)
plt.close()
print(f"Saved: {OUT} ({OUT.stat().st_size // 1024} KB)")
