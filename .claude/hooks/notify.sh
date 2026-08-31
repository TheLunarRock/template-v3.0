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
#   - Notification → 承認待ち（permission_prompt 等）だけを通知する。
#                    待機（idle_prompt）は通知しない。Stop で 1 通目が出たあと
#                    待つほど発火して Slack が積み上がり、Stop の「作業が
#                    終わりました」が「応答がないまま止まっています」に化けるため。
#                    Stop の通知は消すまで残るので idle が無くても見逃さない。
#   - 通知は macOS 通知センター＋サウンド。Slack Webhook 設定時は併せて送信
#   - Stop の通知は既定 15 秒遅らせる。Stop は「1 回の応答が終わった」で発火し、
#     auto mode は 1 つの作業を何ターンにも分けて進めるため、そのままだと作業の
#     途中で何度も鳴る。遅延中に PreToolUse / UserPromptSubmit が来たら
#     （＝作業が続いている）キャンセルする。承認待ちは人間が動かないと進まない
#     ので遅延させない。
#   - デスクトップ通知は notify-repeat.sh に委譲する。alerter があれば
#     「消すまで画面に残る通知」を 1 回だけ出し、無ければ従来どおり
#     気付くまで繰り返す（2026-08-31 実機確認。詳細は notify-repeat.sh 冒頭）。
#     Slack へはどちらの経路でも 1 回だけ送る（スマホ側で履歴が残るため）。
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
#   CLAUDE_NOTIFY_INTERVAL=15 繰り返しの間隔（秒）※フォールバック経路のみ
#   CLAUDE_NOTIFY_MAX=10      繰り返しの上限回数（鳴りっぱなし防止）※同上
#   CLAUDE_NOTIFY_ALERTER     alerter の配置を上書きする（'none' で無効化）
#   CLAUDE_NOTIFY_NO_SLACK=1  Slack 送信だけを止める（デスクトップ通知は出す）。
#                             動作確認で直接叩くたびに実 Slack が飛ぶのを防ぐ
#   CLAUDE_NOTIFY_STOP_DELAY=15 Stop の通知を遅らせる秒数。0 で即時
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
      // 待機は通知しない。マッチャー（settings.json）でも除いているが、
      // すり抜けて呼ばれた場合の保険としてここでも弾く。
      if (String(p.notification_type || "") === "idle_prompt") {
        console.log("SKIP");
        return;
      }
      const LABEL = {
        permission_prompt: "確認待ちで止まっています（ツール使用の承認）",
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

# ---- クリップボード（macOS のみ）----
# 報告本文をクリップボードへ（通知から本文を読み返す手間をなくす）
if [ "$(uname -s)" = "Darwin" ]; then
  if [ -n "$REPORT" ] && command -v pbcopy >/dev/null 2>&1; then
    printf '%s' "$REPORT" | pbcopy
  fi
fi

# ---- 遅延の要否 ----
# Stop だけを遅らせる。DRY_RUN の 5 行フォーマットは変えられないため、
# イベント名だけをここで別途取り出す（判定本体は上の node 呼び出しのまま）。
EVENT=$(printf '%s' "$INPUT" | node -e '
  let d = "";
  process.stdin.on("data", (c) => (d += c));
  process.stdin.on("end", () => {
    let p = {};
    try { p = JSON.parse(d) || {}; } catch (e) {}
    console.log(String(p.hook_event_name || ""));
  });
' 2>/dev/null)

if [ "$EVENT" = "Stop" ]; then
  DELAY="${CLAUDE_NOTIFY_STOP_DELAY:-15}"
else
  # 承認待ちは人間が動かないと進まない状態なので即時に鳴らす
  DELAY=0
fi

# ---- Slack の宛先と本文を解決する ----
# 送信そのものは notify-repeat.sh のジョブ内で行う。遅延中にキャンセルされた
# ときに「デスクトップ通知は取り消されたのに Slack だけ飛ぶ」を防ぐため、
# ここでは送らない。
SLACK_URL=""
SLACK_TEXT=""
if [ "${CLAUDE_NOTIFY_NO_SLACK:-}" != "1" ]; then
  SLACK_URL="${CLAUDE_NOTIFY_WEBHOOK:-}"
  if [ -z "$SLACK_URL" ] && [ -r "$HOME/.claude/notify-webhook.txt" ]; then
    SLACK_URL=$(tr -d '\r\n' < "$HOME/.claude/notify-webhook.txt")
  fi
  if [ -n "$SLACK_URL" ]; then
    SLACK_TEXT="$TITLE
$MESSAGE"
  fi
fi

# ---- 通知の発行（デスクトップ + Slack）を notify-repeat.sh に委譲 ----
# alerter があれば消すまで残る通知を 1 回だけ出し、無ければ気付くまで繰り返す。
# INTERVAL / MAX はフォールバック経路でのみ使われる（alerter 経路では不要）。
# どちらの経路でも停止は notify-stop.sh が担う。
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -x "$HOOK_DIR/notify-repeat.sh" ]; then
  CLAUDE_NOTIFY_SLACK_URL="$SLACK_URL" \
  CLAUDE_NOTIFY_SLACK_TEXT="$SLACK_TEXT" \
    "$HOOK_DIR/notify-repeat.sh" start "${CLAUDE_PROJECT_DIR:-$PWD}" \
      "$TITLE" "$MESSAGE" "$SOUND" \
      "${CLAUDE_NOTIFY_INTERVAL:-15}" "${CLAUDE_NOTIFY_MAX:-10}" "$DELAY"
fi

exit 0
