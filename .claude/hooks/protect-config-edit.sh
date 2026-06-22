#!/usr/bin/env bash
# 保護設定ファイルへの編集を「編集の瞬間」にブロックする PreToolUse Hook
#
# 背景:
#   CLAUDE.md「絶対に変更してはいけない設定ファイル」は従来 commit 時の
#   scripts/protect-config.js（チェックサム照合）でしか検知されなかった。
#   本フックは Edit/Write/MultiEdit の実行直前に発火し、保護ファイルへの
#   書き込みを exit 2 で確定的にブロックする（記事推奨: 禁止はプロンプトでなく
#   Hook で強制する）。Claude のツール経由の編集のみを止めるため、人間が
#   エディタで直接編集する保守作業は妨げない。
#
# 仕組み:
#   - stdin から tool_input.file_path を受け取る
#   - 保護リストは scripts/protect-config.js の PROTECTED_FILES を実行時に読む
#     （単一の真実の源。フック側にリストを複製しないためドリフトしない）
#   - 保護ファイル一致 → exit 2（stderr が Claude に渡りブロック）
#   - .claude/settings.json 一致 → 警告のみ表示し exit 0（保守は許可しつつ
#     deny/ask を弱めないよう注意喚起）
#   - それ以外 → exit 0（通過）
#
# 注意: JSON パースは node -e で行う（jq 非依存。node は前提ツール）。

set -u

INPUT=$(cat)

RESULT=$(printf '%s' "$INPUT" | node -e '
  const fs = require("fs");
  const path = require("path");
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  let d = "";
  process.stdin.on("data", c => (d += c));
  process.stdin.on("end", () => {
    let fp = "";
    try {
      const j = JSON.parse(d);
      const inp = j.tool_input || {};
      fp = inp.file_path || inp.path || "";
    } catch (e) {}
    if (!fp) { console.log("OK"); return; }

    const abs = path.resolve(fp);

    // 保護リストを protect-config.js から読む（単一の真実の源）
    let protectedList = [];
    try {
      const src = fs.readFileSync(path.join(projectDir, "scripts/protect-config.js"), "utf8");
      const m = src.match(/PROTECTED_FILES\s*=\s*\[([\s\S]*?)\]/);
      if (m) protectedList = [...m[1].matchAll(/[\x27"]([^\x27"]+)[\x27"]/g)].map(x => x[1]);
    } catch (e) {}

    for (const rel of protectedList) {
      if (abs === path.resolve(projectDir, rel)) { console.log("BLOCK\t" + rel); return; }
    }

    if (abs === path.resolve(projectDir, ".claude/settings.json")) { console.log("WARN_SETTINGS"); return; }
    console.log("OK");
  });
' 2>/dev/null || echo "OK")

KIND=$(printf '%s' "$RESULT" | cut -f1)
FILE=$(printf '%s' "$RESULT" | cut -f2-)

if [ "$KIND" = "BLOCK" ]; then
  cat >&2 <<BLOCKMSG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ 保護設定ファイルへの編集はブロックされました
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

対象: ${FILE}

このファイルは CLAUDE.md「絶対に変更してはいけない設定ファイル」に
登録されており、品質保証の要のため編集禁止です。

正しい対処法（設定変更ではなくコード修正）:
  ・型エラー    → 適切な型定義を実装する
  ・ESLintエラー → コードを規約に合わせて修正する
  ・テスト失敗  → 実装を修正してテストを通す
  ・ビルドエラー → 根本原因のコードを修正する

どうしても設定変更が必要な場合は、勝手に変更せずユーザーに相談してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BLOCKMSG
  exit 2
fi

if [ "$KIND" = "WARN_SETTINGS" ]; then
  cat <<WARNMSG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  .claude/settings.json を編集しようとしています
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

このファイルは配布テンプレートの既定セキュリティ設定です。
以下は CLAUDE.md の絶対ルールにより禁止されています:
  ・deny ルールの削除・緩和
  ・DB破壊系 ask 設定・PreToolUse Hook の削除/無効化

機能追加（deny/ask/hook の追加）は問題ありません。
既存の保護を弱める変更でないことを確認してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WARNMSG
  exit 0
fi

exit 0
