#!/usr/bin/env bash
OUT="codebase_context.txt"
echo "=== [1] REPO OVERVIEW & SLIDE COUNT ===" > "$OUT"
echo "Slide files in slides/:" >> "$OUT"
ls -la slides/ >> "$OUT"

echo -e "\n=== [2] PRESENTATION.JSON METADATA & SCHEMA ===" >> "$OUT"
head -n 60 data/presentation.json 2>/dev/null >> "$OUT"

echo -e "\n=== [3] JS/PRESENTATION.JS (NAV, SCALING, STAGE) ===" >> "$OUT"
cat js/presentation.js 2>/dev/null >> "$OUT"

echo -e "\n=== [4] JS/PDF-EXPORT.JS (CURRENT PRINT/EXPORT LOGIC) ===" >> "$OUT"
cat js/pdf-export.js 2>/dev/null >> "$OUT"

echo -e "\n=== [5] JS/EDITOR.JS (RESIZE, DRAG, STATE) ===" >> "$OUT"
cat js/editor.js 2>/dev/null >> "$OUT"

echo -e "\n=== [6] CSS PRINT & RESPONSIVE RULES ===" >> "$OUT"
echo "--- presentation.css @media print / stage ---" >> "$OUT"
grep -n -C 5 "@media print" css/presentation.css 2>/dev/null >> "$OUT"
grep -n -C 5 "#stage" css/presentation.css 2>/dev/null >> "$OUT"
echo "--- editor.css print / responsive ---" >> "$OUT"
grep -n -C 5 "@media print" css/editor.css 2>/dev/null >> "$OUT"

echo -e "\n=== [7] SAMPLE SLIDE STRUCTURE (SLIDE 01 & 02) ===" >> "$OUT"
head -n 40 slides/01-cover.html 2>/dev/null >> "$OUT"
echo "---" >> "$OUT"
head -n 40 slides/02-*.html 2>/dev/null >> "$OUT"

echo -e "\n=== [8] CHAPTER 5 EXTRACTED CONTENT STATUS ===" >> "$OUT"
head -n 50 new_thesis/extracted/chapters/05_chapter5_conclusion_future_work.md 2>/dev/null >> "$OUT"

echo -e "\nAudit complete: $OUT written ($(wc -c < "$OUT") bytes)."
