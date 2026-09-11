#!/usr/bin/env bash
# build.sh - chaine de build js13k : extract -> terser -> roadroller -> zip -> mesure
# Usage: bash build.sh path/to/index.html
set -euo pipefail

SRC="${1:-index.html}"
STRIP_DEV="${2:-}"   # passer --strip-dev pour retirer physiquement le panneau de debogage
LIMIT=13312   # 13 * 1024

if [ ! -f "$SRC" ]; then echo "Source introuvable: $SRC"; exit 1; fi

DIR="$(cd "$(dirname "$SRC")" && pwd)"
BASE_KEEP="$(basename "$SRC" .html)"

if [ "$STRIP_DEV" = "--strip-dev" ]; then
  TMPSRC="$(mktemp -t hb).html"
  sed '/\/\/<DEV>/,/\/\/<\/DEV>/d' "$SRC" > "$TMPSRC"
  echo "Panneau de debogage retire du build."
  SRC="$TMPSRC"
fi
BASE="$BASE_KEEP"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"; [ -n "${TMPSRC:-}" ] && rm -f "$TMPSRC"' EXIT

# Outils : terser + roadroller. On les cherche dans plusieurs emplacements
# usuels ; si absents, on installe en global (compatible avec les .npmrc qui
# imposent un prefix). En dernier recours on se rabat sur npx.
find_tool(){  # $1 = nom du binaire
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
  echo "Installation de terser + roadroller (npm -g) ..."
  npm install -g terser roadroller >/dev/null 2>&1 || \
    npm install terser roadroller >/dev/null 2>&1 || \
    echo "ATTENTION: npm install a echoue. Si le reseau est restreint, autorisez registry.npmjs.org."
  TERSER="$(find_tool terser || echo "npx --yes terser")"
  ROADROLLER="$(find_tool roadroller || echo "npx --yes roadroller")"
fi

# 1) Extraire le contenu du dernier <script>...</script> et le <style> + structure.
python3 - "$SRC" "$WORK" <<'PY'
import re, sys
src, work = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()
m = re.search(r'<script>(.*)</script>', html, re.S)
if not m:
    print("Aucun bloc <script> trouve"); sys.exit(1)
open(work + '/game.js', 'w', encoding='utf-8').write(m.group(1))
# Recupere le <style> pour le reinjecter dans le HTML minimal
sm = re.search(r'<style>(.*?)</style>', html, re.S)
open(work + '/style.css', 'w', encoding='utf-8').write(sm.group(1) if sm else '')
PY

# 2) Verifier la syntaxe puis minifier avec terser.
node --check "$WORK/game.js" && echo "Syntaxe JS: OK"
$TERSER "$WORK/game.js" -c passes=3,unsafe=true -m toplevel=true -o "$WORK/game.min.js" 2>/dev/null \
  || cp "$WORK/game.js" "$WORK/game.min.js"
echo "JS minifie (terser): $(wc -c < "$WORK/game.min.js") octets"

# 3) roadroller sur le JS minifie (si dispo).
# La sortie de roadroller varie d'un tirage a l'autre (mesure : 37 octets d'ecart
# sur trois tirages -O1). BEST=N garde le plus petit de N tirages ; RR_ARGS
# passe des options (ex. -O2, ~26 s par tirage). Voir `npm run build:final`.
BEST="${BEST:-1}"
RR_ARGS="${RR_ARGS:-}"
rr_ok=0
if [ -n "$ROADROLLER" ]; then
  for ((i = 1; i <= BEST; i++)); do
    if $ROADROLLER "$WORK/game.min.js" $RR_ARGS -o "$WORK/cand.js" 2>/dev/null; then
      n=$(wc -c < "$WORK/cand.js")
      [ "$BEST" -gt 1 ] && echo "  tirage $i/$BEST : $n octets"
      if [ "$rr_ok" -eq 0 ] || [ "$n" -lt "$(wc -c < "$WORK/game.rr.js")" ]; then
        cp "$WORK/cand.js" "$WORK/game.rr.js"
      fi
      rr_ok=1
    fi
  done
fi
if [ "$rr_ok" -eq 1 ]; then
  echo "JS roadrolled: $(wc -c < "$WORK/game.rr.js") octets"
else
  echo "roadroller indisponible: on garde la version terser."
  cp "$WORK/game.min.js" "$WORK/game.rr.js"
fi

# 4) Reconstruire un HTML minimal autour du JS compresse.
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

# Livrables : la page construite dans dist/js13k/, l'archive a la racine.
# Le zip DOIT contenir index.html a sa racine (reglement js13k).
OUT="$DIR/dist/js13k"
ZIP="$DIR/hoofbeat.zip"
mkdir -p "$OUT"
cp "$WORK/out.html" "$OUT/index.html"

# 5) Zipper en -9 et mesurer.
rm -f "$ZIP"
( cd "$OUT" && zip -9 -q -X "$ZIP" index.html )
echo "zip -9:     $(wc -c < "$ZIP") octets"
# advzip (AdvanceCOMP, zopfli) recompresse le meme contenu : gain mesure ~2,4 %.
if command -v advzip >/dev/null 2>&1; then
  advzip -z -4 -q "$ZIP" && echo "advzip -z4: $(wc -c < "$ZIP") octets"
else
  echo "advzip absent (brew install advancecomp) : archive zip -9 conservee."
fi
Z=$(wc -c < "$ZIP")
MARGIN=$((LIMIT - Z))
echo "----------------------------------------"
echo "ZIP final:  $Z octets  /  $LIMIT max"
if [ "$Z" -le "$LIMIT" ]; then
  echo "DANS LE BUDGET. Marge: $MARGIN octets."
else
  echo "DEPASSEMENT de $((Z - LIMIT)) octets. Reduire le code ou verifier roadroller."
fi
echo "Livrables:"
echo "  - $ZIP                (a soumettre)"
echo "  - $OUT/index.html     (test navigateur)"
echo "  - source lisible: $DIR/index.html (a garder pour editer)"
