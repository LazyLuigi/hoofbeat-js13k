# HOOFBEAT

A [js13kGames 2026](https://js13kgames.com) entry, theme *Unicorns and Rainbows*.
A complete web game in a 13 KB zip archive, with no external file.

## The principle

You can only move forward. Your rainbow trail is recorded during each flight.
On the next run, it becomes **solid**.

Some gaps are deliberately wider than a jump can reach: they are
mathematically impossible on the first try. You have to jump in, die, and use
the arc you just left there as a bridge. **You die to build the path.**

![Gameplay](media/gameplay.gif)

## Run

Open `index.html` in a browser. No install, no server.

## Controls

| key | action |
|---|---|
| Space, Up arrow, W, Z, click, tap | jump; hold to glide once GLIDE is bought |
| Shift, X, round button at the bottom left | dash, once DASH is bought |
| A | open the shop |
| R | rewind after a death, once REWIND is bought |
| N, twice | new world |
| M | mute |
| Escape | leave the shop |

## Build

```bash
nvm use               # Node version from .nvmrc
npm install           # terser and roadroller, versions pinned by package-lock.json
npm run build         # fast build, one roadroller draw
npm run build:final   # build to submit: roadroller -O2, best of three draws
```

Pipeline: script extraction, `terser`, `roadroller`, `zip -9`, `advzip`
(zopfli, if `advancecomp` is installed), then the budget check. Deliverables:

- `hoofbeat.zip` at the root, the archive to submit, with `index.html` at its root;
- `dist/js13k/index.html`, the same page, to test in a browser;
- `dist/wavedash/index.html`, readable and without the DEV panel, for Wavedash.

The zip size changes from one build to the next: roadroller draws its
parameters at random. Read the number the build prints, not one written here.

`--strip-dev` physically removes the debug panel and the autopilot, delimited
by the `//<DEV>` and `//</DEV>` markers. That is the version to submit, and
both npm scripts above pass the flag.

Without the flag (`npm run build:dev`), the build keeps the panel: handy for
testing, too big for the contest.

## Test

```bash
bash test.sh              # the eleven suites on index.html
node tests/fx.js          # one suite on its own
```

Each suite accepts a file as argument, which lets you check a variant:
`node tests/trail.js other.html`.

| suite | what it locks down |
|---|---|
| `wavedash.js` | strict SDK contracts, achievements and leaderboard, source and Terser |
| `headless.js` | the game runs 1800 frames in all five modes, without a browser |
| `tunnel.js` | you never pass through a bridge, from 200 to 2600 px/s, dash included |
| `trail.js` | the ribbon has no hole: in flight, every bucket crossed is recorded |
| `terrain.js` | the ground decor does not flicker as the camera moves forward |
| `ladder.js` | the ten-flag ladder, shield, beam, rewind, New Game + |
| `fx.js` | one effect per power, and only while it is active |
| `party.js` | locked power names stay hidden, the party triggers |
| `attract.js` | the attract screen plays on its own and writes nothing to the save |
| `music.js` | the BUBBLEGUM POP grid, and survival without `AudioContext` |
| `seeds.js` | 40 random worlds: fairness and respect of the curriculum |

The suites use a `vm` context with a fake canvas. No dependency, no browser.

## Architecture

The level is an array indexed by 8 px bucket. The runner only moves right,
so **a trail is a pure function of x**: one `y` per bucket. O(1) collision,
tiny memory, trivial serialization.

Jump reach: `2 × 470 / 1500 × 270` = 169 px, or 21 buckets. Generation
produces gaps of 25 to 37 buckets.

Collision sweeps each frame in sub-steps and interpolates the height between
two samples: without that, you go through bridges while dashing or at a low
frame rate.

A fatal fall is measured 220 px below the local **terrain**, never below a
trail: ribbons stack up toward the sky over the runs, and taking them as the
reference would kill you in mid-flight.

## Curriculum

One new thing at a time, keyed to the flags.

| up to | what appears |
|---|---|
| 100 m | learning ramp: narrow gaps, long platforms |
| 250 m | the hard gaps, hence the trail mechanic |
| 250 m, flag 1 | spikes |
| 500 m, flag 2 | shorter platforms, wider gaps |
| 750 m, flag 3 | crows |

The ten flags, one every 10% of the course, each open a power family:
memory, double jump, glide, shield, dash, beam, new world, coat, rewind,
New Game +. Their names stay hidden until the flag is passed.

## Save

`localStorage`, with an in-memory mirror for environments that refuse it.
The world seed is persisted: the same player gets their course and trails
back. The NEW WORLD button draws a fresh seed.

## Debug panel

The **DEV** button, at the bottom right, opens five actions: clear the save,
unlock everything, advance 1000 m, enable the autopilot, close.

The autopilot chains runs, buys from cheapest to most expensive, uses glide
and dash, and rewinds to extend a run. It exists for captures.

Both live in the source between `//<DEV>` and `//</DEV>`; `--strip-dev`
removes them from the build.

## Wavedash

The platform injects `window.Wavedash`; no SDK or external resource is bundled.
The game initializes it, waits for statistics, and awards one achievement per
flag. Existing local unlocks are synchronized on load. Failed achievement calls
stay queued for the next run; the attract demo earns nothing.

Import `wavedash-achievements.json` manually in the Developer Portal before
playtesting. The ten identifiers match the ten flags. The `best-distance-v1`
leaderboard is created on the first completed run: numeric metres, descending,
keeping each player's highest score. Both deaths and victories submit the
saved distance record; resetting the local world does not erase the online best.

`wavedash.toml` targets `dist/wavedash`. Build first, then use `wavedash dev`
for a signed-in playtest. Local strict SDK tests cover all ten flag crossings,
restore, delayed stats, duplicate awards, failed calls and score submission,
including production Terser options. They do not prove server persistence.

`media/gameplay-wavedash.mp4` contains the first ten seconds of a fresh game,
in 1280×720 H.264 at 30 fps, without audio. Regenerate with the js13k-finalize
skill's `record-gif.py` from the repository root:

```bash
python3 /path/to/js13k-finalize/scripts/record-gif.py --video --secs 10 --fps 30 \
  --seed 1306 --start-js 'DEV=0; startRun()' --driver tools/capture-gameplay.js \
  --keep-frames --out media/gameplay-wavedash.mp4
```

## License

Not chosen yet. js13kGames requires the source to be public.
