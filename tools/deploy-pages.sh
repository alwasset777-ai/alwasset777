#!/bin/bash
# نشر docs/bureau من main إلى gh-pages وانتظار GitHub Pages
# الاستعمال: tools/deploy-pages.sh "Deploy: وصف قصير"  (من بعد ما يتدمج الـ PR فـ main)
set -e
msg="$1"
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
GHP=${W777_GHP:-/tmp/w777-ghp}
cd "$ROOT" && git fetch -q origin main gh-pages
if [ ! -e $GHP/.git ]; then git -C "$ROOT" worktree prune; git -C "$ROOT" worktree add -q -f $GHP origin/gh-pages; fi
cd $GHP && git checkout -q -B gh-pages origin/gh-pages && rm -rf bureau
git -C "$ROOT" archive origin/main docs/bureau | tar -x --strip-components=1
git add -A bureau && git status --short | head -20
git commit -q -m "$msg

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin gh-pages 2>&1 | tail -1
sha=$(git rev-parse --short HEAD)
for i in $(seq 1 24); do r=$(gh api "repos/alwasset777-ai/alwasset777/actions/runs?branch=gh-pages&per_page=1" --jq '.workflow_runs[0] | "\(.head_sha[0:7]) \(.status) \(.conclusion)"' 2>/dev/null || true); case "$r" in $sha*completed*) echo "$r"; exit 0;; esac; sleep 15; done
echo "timeout waiting: $r"
