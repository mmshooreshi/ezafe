#!/usr/bin/env bash
./snapshot.sh > /dev/null  # snapshot first!
OUT="audit_p3.txt"
echo "=== [1] js/editor.js (FULL) ===" > "$OUT"
cat js/editor.js >> "$OUT" 2>/dev/null

echo -e "\n\n=== [2] Save/Backend references anywhere ===" >> "$OUT"
grep -rn "127.0.0.1:8080\|/save\|localhost:8080\|fetch(\|axios" js/ scripts/ index.html 2>/dev/null >> "$OUT"

echo -e "\n\n=== [3] Current toolbar HTML (from scripts/build.js) ===" >> "$OUT"
grep -A 20 "editor-toolbar" scripts/build.js >> "$OUT"

echo -e "\n\n=== [4] presentation.json metadata + slide count ===" >> "$OUT"
node -e "const d=require('./data/presentation.json'); console.log('Slides:', d.slides?.length||'N/A'); console.log('Meta keys:', Object.keys(d.metadata||{})); console.log(JSON.stringify(d.metadata,null,2));" >> "$OUT" 2>/dev/null

echo -e "\n\n=== [5] Existing slide filenames ===" >> "$OUT"
ls slides/ >> "$OUT"

echo -e "\n\n=== [6] editor.css - find toolbar & sidebar rules ===" >> "$OUT"
grep -n "editor-toolbar\|history-sidebar\|editor-btn\|sidebar-" css/editor.css | head -40 >> "$OUT"

echo "✅ Audit at: $OUT"
wc -l "$OUT"
