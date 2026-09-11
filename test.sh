#!/usr/bin/env bash
# test.sh - lance les douze suites sur une source donnee (index.html par defaut)
SRC="${1:-index.html}"
fail=0
for f in headless tunnel trail terrain ladder fx party attract music dev auto seeds; do
  out="$(node "tests/$f.js" "$SRC" 2>&1)"
  last="$(printf '%s' "$out" | tail -1)"
  if printf '%s' "$out" | grep -q "ECHEC\|Error"; then
    printf '  ECHEC   %-9s %s\n' "$f" "$last"; fail=1
    printf '%s\n' "$out" | grep "ECHEC" | sed 's/^/            /'
  else
    printf '  ok      %-9s %s\n' "$f" "$last"
  fi
done
[ $fail -eq 0 ] && echo "" && echo "Toutes les suites passent." || { echo ""; echo "Des suites echouent."; exit 1; }
