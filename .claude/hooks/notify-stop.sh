#!/usr/bin/env bash
# 繰り返し通知を止める（人間が操作を再開したことを検知する経路）
#
# PreToolUse       … 承認して次のツールが動き出した
# UserPromptSubmit … プロンプトを送った（＝気付いた）
#
# 止めるのは「このプロジェクトのループだけ」。並行して動かしている別リポジトリの
# 通知は鳴り続ける（キーの生成は notify-repeat.sh に集約している）。
#
# 注意: ツール実行のたびに走るため、余計な処理（node 起動など）を足さないこと。
#       通知系フックのため、いかなる場合も exit 0 で通過させる。

set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -x "$HERE/notify-repeat.sh" ] || exit 0
"$HERE/notify-repeat.sh" stop "${CLAUDE_PROJECT_DIR:-$PWD}"
exit 0
