# Theme axes — catalog lookup

Diversification uses three axes per theme: **paper band** · **display style** · **accent hue**. Before picking a catalog theme, read the row for your candidate and confirm it differs from the last build on at least one axis.

**Paper band:** `dark` (L < 30%) · `mid` (30–85%) · `light` (> 85%)

**Display style:** high-contrast-serif · roman-serif · classical-serif · geometric-sans · grotesk-sans · rounded-sans · mono · display-condensed · display-heavy · risograph-bold

**Accent hue:** warm (10–60°) · cool (200–300°) · neutral · chromatic-other · multi · per-drop

Per-theme specs with palette + voice live in [`themes/<name>.md`](themes/) when present (Hum, Cobalt, Carnival, Lumen). This file is the axis index for all twenty catalog themes.

| Theme | Paper | Display | Accent | Notes |
| --- | --- | --- | --- | --- |
| Specimen | light | high-contrast-serif | warm | Editorial default-attractor — use sparingly |
| Atelier | light | high-contrast-serif | warm | Foundry-adjacent editorial |
| Brutal | mid | display-heavy | warm | Poster / slab energy |
| Newsprint | light | roman-serif | warm | Newspaper editorial |
| Studio | light | high-contrast-serif | chromatic-other (green) | Forest-green accent |
| Manifesto | light | geometric-sans | warm | Polemical poster |
| Terminal | dark | mono | chromatic-other (phosphor) | CLI / phosphor green |
| Midnight | dark | grotesk-sans | cool | Dark atmospheric |
| Almanac | light | roman-serif | neutral | Docs / reference tone |
| Garden | light | roman-serif | chromatic-other (leaf-green) | Botanical editorial |
| Riso | light | risograph-bold | warm | Overprint / riso register |
| Sport | light | display-condensed | warm | Athletic condensed display |
| Bloom | light | high-contrast-serif | warm | Warm atmospheric |
| Coral | light | geometric-sans | warm | Modern-minimal warm grey |
| Cobalt | light | grotesk-sans | cool | Modern-minimal electric blue — see [`themes/cobalt.md`](themes/cobalt.md) |
| Aurora | dark | high-contrast-serif | cool | Cool atmospheric gradient register |
| Editorial | light | roman-serif | neutral | Generic editorial (Plain) |
| Carnival | light | display-heavy | per-drop | Six palette drops — see [`themes/carnival.md`](themes/carnival.md) |
| Lumen | dark / light | classical-serif | warm / cool | Night (brass) · Day (indigo) drops — see [`themes/lumen.md`](themes/lumen.md) |
| Hum | light | rounded-sans | multi | Playful multi-accent — see [`themes/hum.md`](themes/hum.md) |

## How to use

1. Name your candidate theme and read its three axis values from the table.
2. Compare to the last entry in `.hallmark/log.json` (or the previous output's stamp).
3. If two of three axes match, pick a more distant theme.
4. For catalog entries in `log.json`, look up axes here; for custom entries, read `theme_axes` from the log entry directly.

## Genre clusters (rotation scope)

- **Editorial:** Specimen, Atelier, Brutal, Newsprint, Studio, Manifesto, Almanac, Garden, Riso, Sport, Editorial, Carnival
- **Modern-minimal:** Coral, Cobalt
- **Atmospheric:** Bloom, Midnight, Terminal, Aurora, Lumen
- **Playful:** Hum

Rotate within the genre's cluster unless the brief explicitly crosses genres.
