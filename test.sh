#!/usr/bin/env bash
# test.sh - runs the eleven suites on a given source (index.html by default)
SRC="${1:-index.html}"
fail=0
for f in attract fx headless ladder music party seeds terrain trail tunnel wavedash; do
  out="$(node "tests/$f.js" "$SRC" 2>&1)"
  status=$?
  last="$(printf '%s' "$out" | tail -1)"
  if [ "$status" -ne 0 ] || printf '%s' "$out" | grep -q "FAIL\|Error"; then
    printf '  FAIL    %-9s %s\n' "$f" "$last"; fail=1
    printf '%s\n' "$out" | grep "FAIL" | sed 's/^/            /'
  else
    printf '  ok      %-9s %s\n' "$f" "$last"
  fi
done
[ $fail -eq 0 ] && echo "" && echo "All suites pass." || { echo ""; echo "Some suites fail."; exit 1; }
