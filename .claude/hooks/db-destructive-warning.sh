#!/usr/bin/env bash
# Supabase MCP の破壊的操作前に警告を表示する PreToolUse Hook
# 過去の本番DB削除事故を繰り返さないための第二防御線
#
# 仕組み:
#   - PreToolUse フェーズで stdin から tool_name/tool_input を受け取る
#   - 警告文を stdout に出力（ユーザーに表示される）
#   - exit 0 で通過 → その後 settings.json の ask により承認プロンプトが出る

set -u

INPUT=$(cat)

PARSED=$(printf '%s' "$INPUT" | node -e '
  let d = "";
  process.stdin.on("data", c => d += c);
  process.stdin.on("end", () => {
    try {
      const j = JSON.parse(d);
      const tool = j.tool_name || "unknown";
      const input = j.tool_input || {};
      const preview =
        input.query ||
        input.migration_name ||
        input.branch_id ||
        input.name ||
        "(no preview available)";
      const truncated = String(preview).slice(0, 300);
      console.log("TOOL=" + tool);
      console.log("PREVIEW_START");
      console.log(truncated);
      console.log("PREVIEW_END");
    } catch (e) {
      console.log("TOOL=unknown");
      console.log("PREVIEW_START");
      console.log("(failed to parse tool input)");
      console.log("PREVIEW_END");
    }
  });
' 2>/dev/null || echo "TOOL=unknown")

TOOL=$(printf '%s\n' "$PARSED" | grep '^TOOL=' | head -1 | cut -d= -f2-)
PREVIEW=$(printf '%s\n' "$PARSED" | sed -n '/^PREVIEW_START$/,/^PREVIEW_END$/p' | sed '1d;$d')

cat <<WARNING

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 データベース破壊的操作の警告 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

この操作は本番データを破壊する可能性があります。
一度実行すると元に戻せません。

【過去事故】
  本番DBが勝手に削除される事故が発生しました。
  バックアップで復旧しましたが、二度と繰り返さないでください。

【実行前チェック】
  □ 開発環境ですか？（本番DBなら即キャンセル）
  □ 直近のバックアップを取得していますか？
  □ 操作内容を逐一理解していますか？
  □ 「なんとなくYES」ではなく、明確な理由がありますか？

4つ全てYESでなければ [N] を押してキャンセルしてください。

対象操作: ${TOOL}
内容プレビュー:
${PREVIEW}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WARNING

exit 0
