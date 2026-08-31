#!/usr/bin/env bash
# 気付くまで通知を繰り返すループの起動・停止
#
# 背景:
#   macOS 26 では通知スタイルを「持続的」に設定しても、osascript / terminal-notifier
#   経由の通知が数秒で消える（2026-08-31 に実機で確認）。「クリックするまで画面に残す」
#   ことが OS 側の設定で実現できないため、通知スタイルに依存せず、人間が操作するまで
#   一定間隔で鳴らし続ける方式を採る。
#
# 使い方:
#   notify-repeat.sh start <project-dir> <title> <message> <sound> [interval] [max]
#   notify-repeat.sh stop  <project-dir>
#   notify-repeat.sh key   <project-dir>   … PID ファイル名に使うキーを表示する
#   notify-repeat.sh stop-all              … 全プロジェクトのループを止める（緊急停止）
#
# プロジェクト単位で分離する理由:
#   複数リポジトリを並行で動かすため。1 つのプロジェクトで操作を再開しても、
#   別プロジェクトの通知は鳴り続ける。キーの生成をこのファイルに集約することで、
#   起動側（notify.sh）と停止側（notify-stop.sh）でキーがズレないようにしている。
#
# 停止のされ方:
#   操作を再開すると PreToolUse / UserPromptSubmit フックから notify-stop.sh が
#   呼ばれて止まる。取りこぼしに備えて max 回で自然終了もする（鳴りっぱなし防止）。
#
# 注意: 通知系フックのため、いかなる場合も exit 0 で通過させる。

set -u

PIDDIR="$HOME/.claude/notify-repeat"

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
# ループはバックグラウンドで動くため、エディタを閉じても生き残ってしまう。
# セッションが消えたら鳴らす意味が無いので、生存を監視して止める。
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
  # ループが 1 回で止まってしまう。
  printf ''
}

stop_loop() {
  local f pid
  f=$(pidfile_for "$1")
  [ -f "$f" ] || return 0
  pid=$(cat "$f" 2>/dev/null)
  # プロセスグループごと止める（sleep 中の子プロセスを残さない）
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
  # 全プロジェクトのループを止める（取り残しの掃除・手動の緊急停止用）
  stop-all)
    if [ -d "$PIDDIR" ]; then
      for f in "$PIDDIR"/*.pid; do
        [ -f "$f" ] || continue
        pid=$(cat "$f" 2>/dev/null)
        if [ -n "$pid" ]; then
          kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null
        fi
        rm -f "$f"
      done
    fi
    exit 0
    ;;
  # 稼働中のループを追う / テストでキーの一致を確認するための補助コマンド
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

# 同じプロジェクトの古いループが残っていれば止めてから始める（多重に鳴らさない）
stop_loop "$DIR"

[ "$(uname -s)" = "Darwin" ] || exit 0
[ -n "${CI:-}" ] && exit 0
[ "${CLAUDE_NOTIFY_DISABLED:-}" = "1" ] && exit 0

# 監視対象は通常セッションから辿る。テストでは上書きして挙動を検証する。
WATCH_PID="${CLAUDE_NOTIFY_WATCH_PID:-$(session_pid)}"

# 呼び出し元のセッションが既に終わっているなら、そもそもループを作らない。
# ここで弾かないと、起動直後に終了するループと PID ファイルの書き込みが競合し、
# 誰も参照しない PID ファイルが残る。
if [ -n "$WATCH_PID" ] && ! kill -0 "$WATCH_PID" 2>/dev/null; then
  exit 0
fi

mkdir -p "$PIDDIR" 2>/dev/null || exit 0
PIDFILE=$(pidfile_for "$DIR")

(
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
  rm -f "$PIDFILE"
) >/dev/null 2>&1 &

echo $! > "$PIDFILE"
exit 0
