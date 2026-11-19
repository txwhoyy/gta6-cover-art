# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/txwhoyy/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/txwhoyy/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice Panels** turns your own photos into GTA-style cover art. Drop in one photo or several, spread them across poster panels with heavy black keylines, stamp a big bold title on top, wash the whole thing in a Vice City sunset or neon-night grade, and download a PNG ready to post. Everything runs locally in the browser — photos are read on your machine and never uploaded, and the app needs no network and no build step.

What you can do:

- **Layouts** — Diagonal Trio (slanted comic-style panels), Grid Four, Hero + Strips and Split Duo.
- **Any photo, every panel** — drag a photo inside its panel to reposition it, scroll or use the slider to zoom, click a loaded photo to swap it into the selected panel, or shuffle the set.
- **Title block** — editable title, kicker line and tagline chip, in four lettering styles (Classic White, Vice Pink, Gold Rush, Mint Pop) with outlined display type.
- **Grades** — Vice Sunset, Neon Night, Golden Hour or Clean, applied to the full composition with a printed-poster vignette.
- **Export** — one click downloads a PNG at 1080×1080 (square), 1080×1350 (portrait) or 1920×1080 (wide).

Two AI-generated demo photos (a boulevard at sunset and a pier fisherman) are bundled under `app/samples/`, so the editor opens with a finished cover already on screen.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — or serve the `app/` folder with any static file server and open `index.html`. To hand the entry in the way the grader does: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1paa8b6t&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
