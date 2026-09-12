#!/usr/bin/env bash
# build.sh - js13k build chain: extract -> terser -> roadroller -> zip -> measure
# Usage: bash build.sh path/to/index.html
set -euo pipefail

SRC="${1:-index.html}"
STRIP_DEV="${2:-}"   # pass --strip-dev to physically remove the debug panel
LIMIT=13312   # 13 * 1024

if [ ! -f "$SRC" ]; then echo "Source not found: $SRC"; exit 1; fi

DIR="$(cd "$(dirname "$SRC")" && pwd)"
BASE_KEEP="$(basename "$SRC" .html)"

if [ "$STRIP_DEV" = "--strip-dev" ]; then
  TMPSRC="$(mktemp -t hb).html"
  sed '/\/\/<DEV>/,/\/\/<\/DEV>/d' "$SRC" > "$TMPSRC"
  echo "Debug panel removed from the build."
  SRC="$TMPSRC"
fi
BASE="$BASE_KEEP"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"; [ -n "${TMPSRC:-}" ] && rm -f "$TMPSRC"' EXIT

# Tools: terser + roadroller. We look for them in several usual locations;
# if missing, we install them globally (compatible with .npmrc files that
# enforce a prefix). As a last resort we fall back to npx.
find_tool(){  # $1 = binary name
  local name="$1" p
  for p in \
    "./node_modules/.bin/$name" \
    "$HOME/node_modules/.bin/$name" \
    "$(npm root -g 2>/dev/null)/.bin/$name" \
    "$(npm config get prefix 2>/dev/null)/bin/$name"; do
    [ -x "$p" ] && { echo "$p"; return 0; }
  done
  command -v "$name" >/dev/null 2>&1 && { echo "$name"; return 0; }
  return 1
}
TERSER="$(find_tool terser || true)"
ROADROLLER="$(find_tool roadroller || true)"
if [ -z "$TERSER" ] || [ -z "$ROADROLLER" ]; then
  echo "Installing terser + roadroller (npm -g) ..."
  npm install -g terser roadroller >/dev/null 2>&1 || \
    npm install terser roadroller >/dev/null 2>&1 || \
    echo "WARNING: npm install failed. If the network is restricted, allow registry.npmjs.org."
  TERSER="$(find_tool terser || echo "npx --yes terser")"
  ROADROLLER="$(find_tool roadroller || echo "npx --yes roadroller")"
fi

# Wavedash receives readable code, with the same DEV stripping as js13k.
cp "$SRC" "$WORK/wavedash.html"

# 1) Extract the content of the last <script>...</script> and the <style> + structure.
python3 - "$SRC" "$WORK" <<'PY'
import re, sys
src, work = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()
m = re.search(r'<script>(.*)</script>', html, re.S)
if not m:
    print("No <script> block found"); sys.exit(1)
open(work + '/game.js', 'w', encoding='utf-8').write(m.group(1))
# Grab the <style> to re-inject it into the minimal HTML
sm = re.search(r'<style>(.*?)</style>', html, re.S)
open(work + '/style.css', 'w', encoding='utf-8').write(sm.group(1) if sm else '')
PY

# 2) Check the syntax, then minify with terser.
node --check "$WORK/game.js" && echo "JS syntax: OK"
$TERSER "$WORK/game.js" -c passes=3,unsafe=true -m toplevel=true -o "$WORK/game.min.js" 2>/dev/null \
  || cp "$WORK/game.js" "$WORK/game.min.js"
echo "JS minified (terser): $(wc -c < "$WORK/game.min.js") bytes"

# 3) roadroller on the minified JS (if available).
# roadroller's output varies from one run to the next (measured: 37 bytes of spread
# across three -O1 runs). BEST=N keeps the smallest of N runs; RR_ARGS
# passes options (e.g. -O2, ~26 s per run). See `npm run build:final`.
BEST="${BEST:-1}"
RR_ARGS="${RR_ARGS:-}"
rr_ok=0
if [ -n "$ROADROLLER" ]; then
  for ((i = 1; i <= BEST; i++)); do
    if $ROADROLLER "$WORK/game.min.js" $RR_ARGS -o "$WORK/cand.js" 2>/dev/null; then
      n=$(wc -c < "$WORK/cand.js")
      [ "$BEST" -gt 1 ] && echo "  run $i/$BEST: $n bytes"
      if [ "$rr_ok" -eq 0 ] || [ "$n" -lt "$(wc -c < "$WORK/game.rr.js")" ]; then
        cp "$WORK/cand.js" "$WORK/game.rr.js"
      fi
      rr_ok=1
    fi
  done
fi
if [ "$rr_ok" -eq 1 ]; then
  echo "JS roadrolled: $(wc -c < "$WORK/game.rr.js") bytes"
else
  echo "roadroller unavailable: keeping the terser version."
  cp "$WORK/game.min.js" "$WORK/game.rr.js"
fi

# 4) Rebuild a minimal HTML around the compressed JS.
python3 - "$WORK" <<'PY'
import sys
work = sys.argv[1]
css = open(work + '/style.css', encoding='utf-8').read().strip()
js = open(work + '/game.rr.js', encoding='utf-8').read()
style = ('<style>' + css + '</style>') if css else ''
html = ('<!doctype html><meta charset=utf-8>'
        '<meta name=viewport content="width=device-width,initial-scale=1,user-scalable=no">'
        '<title>HOOFBEAT</title>') + style + '<canvas id=c></canvas><script>' + js + '</script>'
open(work + '/out.html', 'w', encoding='utf-8').write(html)
PY

# Deliverables: the built page in dist/js13k/, the archive at the root.
# The zip MUST contain index.html at its root (js13k rules).
OUT="$DIR/dist/js13k"
ZIP="$DIR/hoofbeat.zip"
mkdir -p "$OUT" "$DIR/dist/wavedash"
cp "$WORK/wavedash.html" "$DIR/dist/wavedash/index.html"
cp "$WORK/out.html" "$OUT/index.html"

# 5) Zip with -9 and measure.
rm -f "$ZIP"
( cd "$OUT" && zip -9 -q -X "$ZIP" index.html )
echo "zip -9:     $(wc -c < "$ZIP") bytes"
# advzip (AdvanceCOMP, zopfli) recompresses the same content: measured gain ~2.4%.
if command -v advzip >/dev/null 2>&1; then
  advzip -z -4 -q "$ZIP" && echo "advzip -z4: $(wc -c < "$ZIP") bytes"
else
  echo "advzip missing (brew install advancecomp): keeping the zip -9 archive."
fi
Z=$(wc -c < "$ZIP")
MARGIN=$((LIMIT - Z))
echo "----------------------------------------"
echo "Final ZIP:  $Z bytes  /  $LIMIT max"
if [ "$Z" -le "$LIMIT" ]; then
  echo "WITHIN BUDGET. Margin: $MARGIN bytes."
else
  echo "OVER BUDGET by $((Z - LIMIT)) bytes. Reduce the code or check roadroller."
fi
echo "Deliverables:"
echo "  - $ZIP                (to submit)"
echo "  - $OUT/index.html     (browser test)"
echo "  - readable source: $DIR/index.html (keep it for editing)"
