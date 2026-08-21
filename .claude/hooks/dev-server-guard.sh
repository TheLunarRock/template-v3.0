#!/usr/bin/env bash
# dev サーバー起動を確定ブロックする PreToolUse Hook（Bash 対象）
#
# 背景:
#   開発サーバー（`next` の dev コマンド）は常駐プロセスのため、AI エージェントが
#   起動するとターミナルが占有され作業がそこで停止する。ユーザーの明示指示により、
#   AI は開発サーバーを起動せず `pnpm build` で動作確認する運用に統一した。
#   Cursor の command denylist は 1.3 で公式に非推奨化されており（バイパス経路が
#   複数報告されたため）エディタ設定では確実に止められない。そのため
#   「起動される側」（scripts/dev-guard.js）と「呼び出す側」（本フック）の
#   二層で止める。
#
# 仕組み（protect-config-edit.sh と同じ確定ブロック方式）:
#   - stdin から tool_input.command を受け取る
#   - 開発サーバー起動コマンドに一致 → exit 2（stderr が Claude に渡りブロック）
#   - それ以外 → exit 0（通過）
#
# 誤検知対策:
#   heredoc 本文とクォート文字列は判定前に除去する。ドキュメントやメッセージに
#   コマンド名が文字列として登場しただけでブロックされるのを防ぐため
#   （本フック導入時に実際に発生した）。
#
# 対象: pnpm/npm/yarn/bun の dev・dev:safe スクリプト、next/vercel の dev 直接起動
# 非対象: pnpm dev:supabase-check（常駐しない検査スクリプトのため通過させる）
#
# 注意: JSON パースとパターン判定は node -e で行う（jq 非依存。node は前提ツール）。

set -u

INPUT=$(cat)

RESULT=$(printf '%s' "$INPUT" | node -e '
  let d = "";
  process.stdin.on("data", c => (d += c));
  process.stdin.on("end", () => {
    let cmd = "";
    try { cmd = String((JSON.parse(d).tool_input || {}).command || ""); } catch (e) {}
    if (!cmd) { console.log("OK"); return; }

    // 判定対象から heredoc 本文とクォート文字列を除去（誤検知防止）
    const scan = cmd
      .replace(/<<-?\s*([\x27"]?)([A-Za-z_][A-Za-z0-9_]*)\1[\s\S]*?^\2\s*$/gm, " ")
      .replace(/\x27[^\x27]*\x27/g, " ")
      .replace(/"[^"]*"/g, " ");

    // パッケージマネージャ経由（dev / dev:safe のみ。dev:supabase-check は通す）
    const PM = /(^|[^\w.\/-])(pnpm|npm|yarn|bun)\s+(run\s+)?dev(:safe)?(\s|$|;|&|\|)/;
    // 直接起動
    const DIRECT = /(^|[^\w.\/-])(next|vercel)\s+dev(\s|$|;|&|\|)/;

    if (PM.test(scan)) { console.log("BLOCK\tパッケージマネージャ経由の dev スクリプト"); return; }
    if (DIRECT.test(scan)) { console.log("BLOCK\t開発サーバーの直接起動"); return; }
    console.log("OK");
  });
' 2>/dev/null || echo "OK")

KIND=$(printf '%s' "$RESULT" | cut -f1)
REASON=$(printf '%s' "$RESULT" | cut -f2-)

[ "$KIND" != "BLOCK" ] && exit 0

cat >&2 <<BLOCKMSG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ 開発サーバーの起動はブロックされました
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

検出: ${REASON}

AI エージェント（Claude Code / Cursor 等）は開発サーバーを起動しません。
常駐プロセスのためターミナルを占有し、作業が停止するためです。

✅ 動作確認は build で行ってください:

    pnpm build       # 型・ビルドエラーを検出
    pnpm validate    # lint + typecheck + test + 境界チェック
    pnpm typecheck   # 型のみ高速確認

ブラウザでの表示確認がどうしても必要な場合は、勝手に起動せず
ユーザーに「ALLOW_DEV_SERVER=1 pnpm dev を実行してください」と依頼すること。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BLOCKMSG

exit 2
