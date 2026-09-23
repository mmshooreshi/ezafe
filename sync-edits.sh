#!/usr/bin/env bash
# =============================================================
# sync-edits.sh — One-shot: bake JSON → build → commit → push
# =============================================================
# Usage:
#   ./sync-edits.sh ~/Downloads/thesis_deck_backup_1234567890.json
#   ./sync-edits.sh ~/Downloads/latest.json "fix: updated ch5 slides"

set -e

JSON_FILE="$1"
COMMIT_MSG="${2:-feat: sync studio edits from browser export}"

if [ -z "$JSON_FILE" ]; then
    echo "❌ Usage: ./sync-edits.sh <backup.json> [\"commit message\"]"
    exit 1
fi

echo ""
echo "🔄 SYNC PIPELINE: JSON → Source Files → Build → Deploy"
echo "======================================================="
echo ""

# 1. Snapshot first
if [ -x ./snapshot.sh ]; then
    echo "📸 Creating snapshot..."
    ./snapshot.sh > /dev/null
fi

# 2. Bake JSON into source slides
echo "🧑‍🍳 Baking JSON into slide sources..."
node scripts/bake.js "$JSON_FILE" --force

# 3. Recompile index.html
echo ""
echo "🔨 Rebuilding index.html..."
node scripts/build.js

# 4. Git commit + push
echo ""
echo "📤 Committing to git..."
git add -A
git diff --staged --quiet && echo "✨ Nothing to commit." || {
    git commit -m "$COMMIT_MSG"
    echo ""
    echo "🚀 Pushing to remote (Vercel will auto-deploy)..."
    git push
    echo ""
    echo "✅ Done! Changes will be live on Vercel in ~30 seconds."
}
