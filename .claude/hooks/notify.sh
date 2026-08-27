#!/usr/bin/env bash
# 作業完了・確認待ちを macOS 通知で知らせる Hook（Stop / Notification 対象）
#
# 背景:
#   claude.ai は作業が止まったときにデスクトップ通知を出すが、エディタ内の
#   Claude Code は既定では何も鳴らない。作業完了・承認待ち・無応答のまま
#   止まっている状態に気付けず放置する時間が実害になっていたため、
#   テンプレート同梱の Hook として通知を標準装備する。
#
# 仕組み:
#   - stdin から Hook ペイロード（JSON）を受け取り node で解析する（jq 非依存）
#   - Stop         → 「作業が終わりました」＋ 最終回答をクリップボードへコピー
#                    （Stop ペイロードの last_assistant_message を使うため
#                     transcript の解析は不要）
#   - Notification → notification_type ごとの文言で「止まっている」ことを通知
#   - 通知は macOS 通知センター＋サウンド。Slack Webhook 設定時は併せて送信
#
# 秘密情報の扱い:
#   Slack Webhook URL は git 管理下に置かない。以下の順で解決する。
#     1. 環境変数 CLAUDE_NOTIFY_WEBHOOK
#     2. ~/.claude/notify-webhook.txt（pnpm setup:sc が chmod 600 で作成）
#   どちらも無ければ Slack 送信はスキップする（macOS 通知は出る）。
#
# 制御用の環境変数:
#   CLAUDE_NOTIFY_DISABLED=1  通知を完全に無効化する
#   CLAUDE_NOTIFY_DRY_RUN=1   副作用を起こさず判定結果のみ stdout に出す（テスト用）
#
# 注意: 本フックは通知専用のため、いかなる場合も exit 0 で通過させる。
#       ガード系フック（dev-server-guard 等）と違い作業を止めてはならない。

set -u

[ "${CLAUDE_NOTIFY_DISABLED:-}" = "1" ] && exit 0

INPUT=$(cat)

# 判定結果のフォーマット（改行区切り）:
#   1行目      OK | SKIP
#   2行目      通知タイトル
#   3行目      通知本文（1行に正規化済み）
#   4行目      サウンド名（/System/Library/Sounds/<name>.aiff）
#   5行目以降  クリップボードへ入れる本文（無い場合は空）
RESULT=$(printf '%s' "$INPUT" | node -e '
  let d = "";
  process.stdin.on("data", (c) => (d += c));
  process.stdin.on("end", () => {
    let p = {};
    try { p = JSON.parse(d) || {}; } catch (e) {}

    const event = String(p.hook_event_name || "");
    const project = String(p.cwd || "").split("/").filter(Boolean).pop() || "project";

    let title = "";
    let message = "";
    let sound = "";
    let clip = "";

    if (event === "Stop") {
      clip = String(p.last_assistant_message || "");
      title = "✅ Claude Code — " + project;
      message = clip
        ? "作業が終わりました。報告はクリップボードにあります"
        : "作業が終わりました";
      sound = "Glass";
    } else if (event === "Notification") {
      const LABEL = {
        permission_prompt: "確認待ちで止まっています（ツール使用の承認）",
        idle_prompt: "応答がないまま止まっています",
        elicitation_dialog: "入力を求めて止まっています",
        elicitation_url_dialog: "URL の入力を求めて止まっています",
        agent_needs_input: "サブエージェントが入力を待っています",
      };
      title = "⏸ Claude Code — " + project;
      message = LABEL[String(p.notification_type || "")] ||
        String(p.message || "確認待ちで止まっています");
      sound = "Ping";
    } else {
      console.log("SKIP");
      return;
    }

    // 通知センターでの表示崩れを防ぐため本文は 1 行に正規化する
    message = message.replace(/\s+/g, " ").trim();

    console.log(["OK", title, message, sound].join("\n") + "\n" + clip);
  });
' 2>/dev/null) || RESULT="SKIP"

# テスト用: 副作用を起こさず判定結果だけを返す（CI・非 macOS でも検証できる）
if [ "${CLAUDE_NOTIFY_DRY_RUN:-}" = "1" ]; then
  printf '%s\n' "$RESULT"
  exit 0
fi

[ "$(printf '%s\n' "$RESULT" | sed -n '1p')" = "OK" ] || exit 0

# CI では通知しない（デスクトップも Slack も不要なノイズになるため）
[ -n "${CI:-}" ] && exit 0

TITLE=$(printf '%s\n' "$RESULT" | sed -n '2p')
MESSAGE=$(printf '%s\n' "$RESULT" | sed -n '3p')
SOUND=$(printf '%s\n' "$RESULT" | sed -n '4p')
REPORT=$(printf '%s\n' "$RESULT" | sed -n '5,$p')

# ---- macOS 通知（通知センター・サウンド・クリップボード） ----
if [ "$(uname -s)" = "Darwin" ]; then
  # 報告本文をクリップボードへ（通知から本文を読み返す手間をなくす）
  if [ -n "$REPORT" ] && command -v pbcopy >/dev/null 2>&1; then
    printf '%s' "$REPORT" | pbcopy
  fi

  # 引数渡しで表示する（本文の " や \ による AppleScript 崩れを防ぐ）
  osascript -e 'on run argv
    display notification (item 1 of argv) with title (item 2 of argv)
  end run' "$MESSAGE" "$TITLE" >/dev/null 2>&1

  # 通知センターの権限設定に関わらず音は鳴らしたいので afplay で明示的に再生する
  if [ -r "/System/Library/Sounds/${SOUND}.aiff" ]; then
    afplay "/System/Library/Sounds/${SOUND}.aiff" >/dev/null 2>&1 &
  fi
fi

# ---- Slack 通知（Webhook が設定されている場合のみ） ----
WEBHOOK="${CLAUDE_NOTIFY_WEBHOOK:-}"
if [ -z "$WEBHOOK" ] && [ -r "$HOME/.claude/notify-webhook.txt" ]; then
  WEBHOOK=$(tr -d '\r\n' < "$HOME/.claude/notify-webhook.txt")
fi

if [ -n "$WEBHOOK" ]; then
  PAYLOAD=$(NOTIFY_TITLE="$TITLE" NOTIFY_MESSAGE="$MESSAGE" node -e '
    console.log(JSON.stringify({
      text: process.env.NOTIFY_TITLE + "\n" + process.env.NOTIFY_MESSAGE,
    }));
  ' 2>/dev/null)
  if [ -n "$PAYLOAD" ]; then
    curl -s --max-time 5 -X POST "$WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD" >/dev/null 2>&1
  fi
fi

exit 0
