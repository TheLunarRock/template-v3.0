#!/usr/bin/env bash
# デスクトップ通知の発行・停止（消すまで残る通知 / 繰り返しのフォールバック）
#
# 背景:
#   macOS 26 では通知スタイルを「持続的」に設定しても、osascript / terminal-notifier
#   経由の通知が数秒で消える（2026-08-31 に実機で確認）。当初は「気付くまで一定間隔で
#   鳴らし続ける」方式を採ったが、osascript の display notification はバナーの
#   ディスミスをコールバックしないため、バツ印で消しても止められず実運用で邪魔になった。
#
#   2026-08-31 の検証で alerter が解決策になることを確認した。
#     - 通知が消えるまで画面に残る
#     - 消されるまでブロックし、消された理由を JSON で返す
#       （バツ印で消すと activationType "closed" / 放置すると "timeout"）
#     - --remove <group> で別プロセスから消せる
#   つまり繰り返す必要がない。1 回出して、消されるまで待つだけでよい。
#
#   ただしテンプレートは友人に配られるため brew install を前提にできない。
#   alerter があればそれを使い、無ければ従来の繰り返し方式にフォールバックする。
#
# 使い方:
#   notify-repeat.sh start <project-dir> <title> <message> <sound> [interval] [max] [delay]
#   notify-repeat.sh stop  <project-dir>
#   notify-repeat.sh key   <project-dir>   … 通知のグループ ID / PID ファイル名を表示する
#   notify-repeat.sh stop-all              … 全プロジェクトの通知を消す（緊急停止）
#
#   interval / max はフォールバック経路（alerter が無い環境）でのみ使う。
#   delay は通知を出すまでの待ち時間（秒）。Stop は「1 回の応答が終わった」で
#   発火し、auto mode では作業の途中で何度も鳴るため、待っている間に作業が
#   再開されたらキャンセルする。0 なら即時。
#
#   PID ファイルの置き場所は CLAUDE_NOTIFY_PIDDIR で上書きできる（既定は
#   $HOME/.claude/notify-repeat）。stop-all がディレクトリ内の全 PID を kill する
#   仕様のため、テストは必ず専用ディレクトリを渡して実運用と分離すること。
#
#   Slack は環境変数 CLAUDE_NOTIFY_SLACK_URL / CLAUDE_NOTIFY_SLACK_TEXT で受け取る。
#   遅延・Slack・デスクトップ通知を 1 本のバックグラウンドジョブにまとめており、
#   PID ファイル 1 つで丸ごとキャンセルできる。キャンセルされたときに
#   「デスクトップ通知だけ取り消されて Slack は飛ぶ」という最悪の形を避けるため、
#   Slack 送信も必ずこのジョブの中で行う（notify.sh 側では送らない）。
#
# プロジェクト単位で分離する理由:
#   複数リポジトリを並行で動かすため。1 つのプロジェクトで操作を再開しても、
#   別プロジェクトの通知は残る。キーの生成をこのファイルに集約することで、
#   起動側（notify.sh）と停止側（notify-stop.sh）でキーがズレないようにしている。
#   このキーは alerter の --group にもそのまま渡すため、--remove で消す対象が
#   常に「自分のプロジェクトの通知だけ」になる。
#
# 停止のされ方:
#   操作を再開すると PreToolUse / UserPromptSubmit フックから notify-stop.sh が
#   呼ばれて止まる。alerter 経路ではバツ印で消しても止まる（それが本来の目的）。
#   フォールバック経路は取りこぼしに備えて max 回で自然終了する（鳴りっぱなし防止）。
#
# 注意: 通知系フックのため、いかなる場合も exit 0 で通過させる。

set -u

# PID ファイルの置き場所。既定は実運用向けの $HOME/.claude/notify-repeat。
# stop-all はこのディレクトリ内の *.pid を「プロジェクトを問わず全て」kill するため、
# テストが既定値のまま走ると、並列実行中の別テストの待機ジョブや、開発者が
# 実際に受け取るはずだった通知まで巻き添えで消える。テストはこの変数で
# テストごとの一時ディレクトリを渡し、実運用と状態を共有しないこと。
PIDDIR="${CLAUDE_NOTIFY_PIDDIR:-$HOME/.claude/notify-repeat}"

# alerter に渡す保険のタイムアウト（秒）。0 にすると、停止を取りこぼしたときに
# 通知が永久に残るため、長めの有限値にしておく。
ALERTER_TIMEOUT=1800

# 通知を消したかどうかを見張る間隔（秒）。alerter 経路でのみ使う。
ALERTER_WATCH_POLL=5

# alerter の実行ファイルを返す（無ければ非ゼロで返る）。
# CLAUDE_NOTIFY_ALERTER で配置を上書きできる。'none' を渡すと明示的に無効化され、
# 実機に alerter が入っていてもフォールバック経路を検証できる。
alerter_bin() {
  if [ -n "${CLAUDE_NOTIFY_ALERTER:-}" ]; then
    [ "$CLAUDE_NOTIFY_ALERTER" = "none" ] && return 1
    [ -x "$CLAUDE_NOTIFY_ALERTER" ] || return 1
    printf '%s' "$CLAUDE_NOTIFY_ALERTER"
    return 0
  fi
  command -v alerter 2>/dev/null
}

# プロジェクトディレクトリから一意なキーを作る。
# 可読性のため basename を残しつつ、同名リポジトリの衝突をハッシュで避ける。
key_for() {
  local dir="$1"
  local base hash
  base=$(printf '%s' "$(basename "$dir")" | tr -c 'A-Za-z0-9._-' '_')
  hash=$(printf '%s' "$dir" | shasum | cut -c1-8)
  printf '%s-%s' "$base" "$hash"
}

pidfile_for() {
  printf '%s/%s.pid' "$PIDDIR" "$(key_for "$1")"
}

# 呼び出し元の Claude Code セッションの PID を辿る。
# 通知はバックグラウンドで待つため、エディタを閉じても生き残ってしまう。
# セッションが消えたら知らせる意味が無いので、生存を監視して止める。
session_pid() {
  local pid="$PPID" comm i=0
  while [ "$pid" -gt 1 ] && [ "$i" -lt 12 ]; do
    comm=$(ps -o comm= -p "$pid" 2>/dev/null | sed 's#.*/##')
    case "$comm" in
      claude | Claude)
        printf '%s' "$pid"
        return 0
        ;;
    esac
    pid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
    [ -n "$pid" ] || break
    i=$((i + 1))
  done
  # 辿れなかった場合は監視しない（空を返す）。
  # 直近の親はフック実行用のシェルで即座に終了するため、監視対象にすると
  # 通知が 1 回で止まってしまう。
  printf ''
}

# 画面に出ている通知を消し、待機中のプロセスを止める。
# alerter 経路とフォールバック経路のどちらで出したかを問わず動く必要がある
# （PID を kill しても alerter が出したバナーは画面に残るため --remove が要る）。
stop_loop() {
  local f pid a
  f=$(pidfile_for "$1")
  # 通知が出ていなければ何もしない。PreToolUse から毎回呼ばれるため、
  # ここを早期 return にして通常のツール実行に負荷をかけない。
  [ -f "$f" ] || return 0
  if a=$(alerter_bin); then
    "$a" --remove "$(key_for "$1")" >/dev/null 2>&1
  fi
  pid=$(cat "$f" 2>/dev/null)
  # プロセスグループごと止める（待機中の子プロセスを残さない）
  if [ -n "$pid" ]; then
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null
  fi
  rm -f "$f"
}

ACTION="${1:-}"
DIR="${2:-$PWD}"

case "$ACTION" in
  stop)
    stop_loop "$DIR"
    exit 0
    ;;
  # 全プロジェクトの通知を消す（取り残しの掃除・手動の緊急停止用）
  stop-all)
    if [ -d "$PIDDIR" ]; then
      ALERTER_ALL=$(alerter_bin) || ALERTER_ALL=""
      for f in "$PIDDIR"/*.pid; do
        [ -f "$f" ] || continue
        # PID ファイル名がそのまま通知のグループ ID になっている
        if [ -n "$ALERTER_ALL" ]; then
          "$ALERTER_ALL" --remove "$(basename "$f" .pid)" >/dev/null 2>&1
        fi
        pid=$(cat "$f" 2>/dev/null)
        if [ -n "$pid" ]; then
          kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null
        fi
        rm -f "$f"
      done
    fi
    exit 0
    ;;
  # 稼働中の通知を追う / テストでキーの一致を確認するための補助コマンド
  key)
    key_for "$DIR"
    printf '\n'
    exit 0
    ;;
  start) ;;
  *) exit 0 ;;
esac

TITLE="${3:-Claude Code}"
MESSAGE="${4:-}"
SOUND="${5:-Ping}"
INTERVAL="${6:-15}"
MAX="${7:-10}"
DELAY="${8:-0}"

# 遅延は非負整数のみ受け付ける（不正値は即時扱いにして通知を落とさない）
case "$DELAY" in
  '' | *[!0-9]*) DELAY=0 ;;
esac

# Slack は notify.sh が解決した URL と本文を環境変数で受け取る。
# ここで送るのは「キャンセル時に Slack だけ飛ぶ」ことを防ぐため。
SLACK_URL="${CLAUDE_NOTIFY_SLACK_URL:-}"
SLACK_TEXT="${CLAUDE_NOTIFY_SLACK_TEXT:-}"

# 同じプロジェクトの古い通知が残っていれば消してから始める（多重に出さない）。
# 遅延待ちのジョブもここで破棄されるため、連続する Stop で二重に鳴らない。
stop_loop "$DIR"

[ -n "${CI:-}" ] && exit 0
[ "${CLAUDE_NOTIFY_DISABLED:-}" = "1" ] && exit 0

IS_DARWIN=0
[ "$(uname -s)" = "Darwin" ] && IS_DARWIN=1

# macOS でなく Slack も送らないなら、やることが無い
if [ "$IS_DARWIN" = "0" ] && { [ -z "$SLACK_URL" ] || [ -z "$SLACK_TEXT" ]; }; then
  exit 0
fi

# 監視対象は通常セッションから辿る。テストでは上書きして挙動を検証する。
WATCH_PID="${CLAUDE_NOTIFY_WATCH_PID:-$(session_pid)}"

# 呼び出し元のセッションが既に終わっているなら、そもそも通知を出さない。
# ここで弾かないと、起動直後に終了する待機プロセスと PID ファイルの書き込みが
# 競合し、誰も参照しない PID ファイルが残る。
if [ -n "$WATCH_PID" ] && ! kill -0 "$WATCH_PID" 2>/dev/null; then
  exit 0
fi

mkdir -p "$PIDDIR" 2>/dev/null || exit 0
PIDFILE=$(pidfile_for "$DIR")
KEY=$(key_for "$DIR")

# 遅延・Slack・デスクトップ通知を 1 本のジョブにまとめる。
# PID ファイルに入るのはこのジョブの PID だけなので、notify-stop.sh から
# 丸ごとキャンセルできる（遅延中に kill されれば Slack も通知も起こらない）。
(
  # ---- 遅延（この間にキャンセルされたら何も起こらない）----
  waited=0
  while [ "$waited" -lt "$DELAY" ]; do
    # 待っている間にエディタが閉じられたら、遅延中のものも捨てる
    if [ -n "$WATCH_PID" ] && ! kill -0 "$WATCH_PID" 2>/dev/null; then
      rm -f "$PIDFILE"
      exit 0
    fi
    sleep 1
    waited=$((waited + 1))
  done

  # ---- Slack（1 回だけ）----
  if [ -n "$SLACK_URL" ] && [ -n "$SLACK_TEXT" ]; then
    PAYLOAD=$(NOTIFY_TEXT="$SLACK_TEXT" node -e '
      console.log(JSON.stringify({ text: process.env.NOTIFY_TEXT }));
    ' 2>/dev/null)
    if [ -n "$PAYLOAD" ]; then
      curl -s --max-time 5 -X POST "$SLACK_URL" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" >/dev/null 2>&1
    fi
  fi

  # ---- デスクトップ通知（macOS のみ）----
  if [ "$IS_DARWIN" = "1" ]; then
    if ALERTER=$(alerter_bin); then
      # ---- alerter 経路: 消すまで残る通知を 1 回だけ出す ----
      # alerter は通知が消されるまでブロックするため、必ずバックグラウンドで
      # 起動する。前景で呼ぶとこのジョブが返らず、停止処理と噛み合わない。
      "$ALERTER" --title "$TITLE" --message "$MESSAGE" --sound "$SOUND" \
        --group "$KEY" --timeout "$ALERTER_TIMEOUT" >/dev/null 2>&1 &
      alerter_pid=$!

      # 消されるまで待つ。待っている間にセッションが終了したら通知を消す
      # （エディタを閉じた後に通知が残り続けるのを防ぐ）。
      while kill -0 "$alerter_pid" 2>/dev/null; do
        if [ -n "$WATCH_PID" ] && ! kill -0 "$WATCH_PID" 2>/dev/null; then
          "$ALERTER" --remove "$KEY" >/dev/null 2>&1
          kill "$alerter_pid" 2>/dev/null
          break
        fi
        sleep "$ALERTER_WATCH_POLL"
      done
    else
      # ---- フォールバック: alerter が無い環境では気付くまで繰り返す ----
      # osascript の通知は数秒で消えるうえディスミスを検知できないため、
      # 一定間隔で鳴らし直すことでしか気付かせられない。
      i=0
      while [ "$i" -lt "$MAX" ]; do
        # 呼び出し元のセッションが終了していたら鳴らさない。
        # これが無いと、エディタを閉じた後も上限回数まで鳴り続ける。
        if [ -n "$WATCH_PID" ]; then
          kill -0 "$WATCH_PID" 2>/dev/null || break
        fi

        # 引数渡しで表示する（本文の " や \ による AppleScript 崩れを防ぐ）
        osascript -e 'on run argv
          display notification (item 1 of argv) with title (item 2 of argv)
        end run' "$MESSAGE" "$TITLE" >/dev/null 2>&1

        # 通知センターの権限が無い環境でも音だけは鳴らす
        if [ -r "/System/Library/Sounds/${SOUND}.aiff" ]; then
          afplay "/System/Library/Sounds/${SOUND}.aiff" >/dev/null 2>&1
        fi

        i=$((i + 1))
        [ "$i" -ge "$MAX" ] && break
        sleep "$INTERVAL"
      done
    fi
  fi

  rm -f "$PIDFILE"
) >/dev/null 2>&1 &

echo $! > "$PIDFILE"
exit 0
