#!/usr/bin/env bash
# git push の事故を防ぐ警告 PreToolUse Hook（Bash 対象）
#
# 背景:
#   CLAUDE.md「feature branch をリモートに push しない」「force push は
#   --force-with-lease を使う」は従来プロンプト文のみで、settings.json では
#   Bash(git push:*) が全許可のため機械的なガードが無かった。過去に feature
#   ブランチの連投 push で Vercel build minutes を大量消費する実害（silver-hp）
#   が発生している。
#
# 仕組み（db-destructive-warning.sh と同じ二層防御の片翼）:
#   - 本フックは「警告表示」のみ（exit 0）。実際の確認ゲートは settings.json の
#     ask（feature push / --force）が担う。
#   - feature/* ブランチのリモート push、および素の --force（--force-with-lease
#     以外）を検出したら警告を表示する。
#
# 注意: JSON パースは node -e で行う（jq 非依存）。

set -u

INPUT=$(cat)

CMD=$(printf '%s' "$INPUT" | node -e '
  let d = "";
  process.stdin.on("data", c => (d += c));
  process.stdin.on("end", () => {
    try { const j = JSON.parse(d); process.stdout.write(String((j.tool_input || {}).command || "")); }
    catch (e) { process.stdout.write(""); }
  });
' 2>/dev/null || echo "")

# git push 以外は何もしない
if ! printf '%s' "$CMD" | grep -Eq '(^|[^[:alnum:]_])git[[:space:]]+push([[:space:]]|$)'; then
  exit 0
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

REASON_FORCE=""
REASON_FEATURE=""

# 素の --force（--force-with-lease は許可）
if printf '%s' "$CMD" | grep -Eq '\-\-force([[:space:]]|$)' && ! printf '%s' "$CMD" | grep -q '\-\-force-with-lease'; then
  REASON_FORCE="yes"
fi

# feature ブランチのリモート push
#  (a) 現在ブランチが feature/* で origin への push
#  (b) コマンドが明示的に feature/ ref を origin に push
if printf '%s' "$BRANCH" | grep -Eq '^feature/' && printf '%s' "$CMD" | grep -Eq 'origin'; then
  REASON_FEATURE="$BRANCH"
elif printf '%s' "$CMD" | grep -Eq 'origin[[:space:]]+(HEAD:)?feature/'; then
  REASON_FEATURE="(指定された feature ref)"
fi

if [ -z "$REASON_FORCE" ] && [ -z "$REASON_FEATURE" ]; then
  exit 0
fi

cat <<'HDR'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 git push の確認警告 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HDR

if [ -n "$REASON_FEATURE" ]; then
  echo "  ・feature ブランチ ${REASON_FEATURE} のリモート push を検出"
  echo "    → PR運用OFF（個人開発）では feature ブランチを push しないこと。"
  echo "      Vercel preview / Actions 二重実行でクレジットを消費します"
  echo "      （過去実害: silver-hp で build minutes 9時間）。"
  echo "      標準フロー: ローカルで main に merge → git push origin main のみ。"
fi

if [ -n "$REASON_FORCE" ]; then
  echo "  ・素の --force を検出"
  echo "    → 必ず --force-with-lease を使うこと（他者コミットの問答無用上書きを防ぐ）。"
fi

cat <<'FTR'

意図した操作でなければ [N] でキャンセルしてください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FTR

exit 0
