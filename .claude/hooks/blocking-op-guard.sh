#!/usr/bin/env bash
# 長時間ブロックする操作を確定ブロックする PreToolUse Hook
# 対象: ブラウザ自動操作 MCP / Bash の常駐・追従コマンド
#
# 背景:
#   AI エージェントの作業が長時間止まる原因は「dev サーバー起動」だけではない。
#   実際に、dev サーバーを禁止した結果エージェントがブラウザ自動操作
#   （claude-in-chrome）で実機確認を始め、拡張との往復が 13 回続いて止まって
#   見える事象が発生した。禁止すべきは「起動」ではなく「戻ってこない操作」全般
#   であるため、以下 3 カテゴリを機械的に止める。
#
#     A. ブラウザ自動操作   … 1操作ごとに外部往復。遅く不安定
#     B. 常駐プロセス       … フォアグラウンドに居座りターミナルを占有
#     C. 追従・長時間待機   … ログ follow / watch / 長い sleep で戻らない
#
#   AI の動作確認は品質ゲート（build / typecheck / lint / test / boundaries）
#   までとし、実画面の確認は人間が行う。
#
# 仕組み（dev-server-guard.sh と同じ確定ブロック方式）:
#   - stdin から tool_name / tool_input を受け取る
#   - 該当 → exit 2（stderr が AI に渡りツール実行がブロックされる）
#   - それ以外 → exit 0（通過）
#
# 誤検知対策:
#   heredoc 本文とクォート文字列は判定前に除去する。さらにコマンド行を
#   「単純コマンド」に分割し、先頭トークン（実行されるコマンド）のみを
#   判定対象とする。`pnpm add -D @playwright/test` のような言及・インストールは
#   ブロックしない。
#
# 非対象: dev サーバー起動（dev-server-guard.sh が担当・メッセージを分けるため）
#
# 注意: JSON パースとパターン判定は node -e で行う（jq 非依存。node は前提ツール）。

set -u

INPUT=$(cat)

RESULT=$(printf '%s' "$INPUT" | node -e '
  let d = "";
  process.stdin.on("data", c => (d += c));
  process.stdin.on("end", () => {
    let tool = "", cmd = "";
    try {
      const j = JSON.parse(d);
      tool = String(j.tool_name || "");
      cmd = String((j.tool_input || {}).command || "");
    } catch (e) {}

    const out = (kind, detail) => console.log(kind + "\t" + detail);

    // ── A. ブラウザ自動操作 MCP ───────────────────────────────
    if (/^mcp__(claude-in-chrome|playwright|puppeteer)__/.test(tool)) {
      out("BROWSER", "ブラウザ自動操作 MCP の呼び出し (" + tool + ")");
      return;
    }

    if (!cmd) { console.log("OK"); return; }

    // 判定対象から heredoc 本文とクォート文字列を除去（誤検知防止）
    const scan = cmd
      .replace(/<<-?\s*([\x27"]?)([A-Za-z_][A-Za-z0-9_]*)\1[\s\S]*?^\2\s*$/gm, " ")
      .replace(/\x27[^\x27]*\x27/g, " ")
      .replace(/"[^"]*"/g, " ");

    // 単純コマンド単位に分割（; && || | 改行 で区切る）
    const PM = new Set(["pnpm", "npm", "yarn", "bun"]);
    const WRAPPER = new Set(["sudo", "time", "nohup", "exec", "command", "then", "do", "else"]);

    for (const raw of scan.split(/;|&&|\|\||\||\n|&/)) {
      let t = raw.trim().split(/\s+/).filter(Boolean);

      // 先頭の環境変数代入 (FOO=bar) とラッパーを剥がす
      while (t.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t[0]) || WRAPPER.has(t[0]))) t = t.slice(1);
      if (!t.length) continue;

      // npx / bunx とその直後のオプションを剥がす
      if (t[0] === "npx" || t[0] === "bunx") {
        t = t.slice(1);
        while (t.length && t[0].startsWith("-")) t = t.slice(1);
      }

      // パッケージマネージャ経由は run/exec/dlx を剥がして実体を見る
      if (t.length && PM.has(t[0])) {
        t = t.slice(1);
        while (t.length && (["run", "exec", "dlx"].includes(t[0]) || t[0].startsWith("-"))) t = t.slice(1);
      }
      if (!t.length) continue;

      const head = t[0];
      const args = t.slice(1);
      const has = (...flags) => args.some(a => flags.includes(a) || flags.some(f => a.startsWith(f + "=")));

      // ── A. ブラウザ自動操作 CLI ─────────────────────────────
      if (["playwright", "puppeteer", "lighthouse", "chromedriver", "selenium-side-runner"].includes(head)) {
        out("BROWSER", head + " の実行");
        return;
      }

      // ── B. 常駐プロセス ─────────────────────────────────────
      if (["serve", "http-server", "live-server", "ngrok", "watch"].includes(head)) {
        out("RESIDENT", head + " は常駐プロセス");
        return;
      }
      // テンプレート同梱の常駐スクリプト（watch / UI サーバー）
      if (["start", "test:unit:watch", "test:unit:ui", "test:coverage:ui", "sc:debug", "fix:bug"].includes(head)) {
        out("RESIDENT", "常駐する pnpm スクリプト (" + head + ")");
        return;
      }
      if (head === "next" && args[0] === "start") { out("RESIDENT", "next start は常駐サーバー"); return; }
      if (head === "supabase" && args[0] === "start") { out("RESIDENT", "supabase start は常駐スタック"); return; }
      if ((head === "docker-compose" || (head === "docker" && args[0] === "compose")) &&
          args.includes("up") && !has("-d", "--detach")) {
        out("RESIDENT", "docker compose up（-d なし）は常駐");
        return;
      }
      if (/^python3?$/.test(head) && args[0] === "-m" && args[1] === "http.server") {
        out("RESIDENT", "python http.server は常駐");
        return;
      }
      if (head === "php" && args.includes("-S")) { out("RESIDENT", "php -S は常駐"); return; }
      // watch モード（--watch は実質すべて常駐）
      if (has("--watch", "--watchAll", "--watch-path")) { out("RESIDENT", "--watch は常駐モード"); return; }
      if ((head === "vitest" || head === "jest") && !args.includes("run")) {
        out("RESIDENT", head + " の既定は watch モード（run を付けること）");
        return;
      }
      if (head === "vitest" && has("--ui")) { out("RESIDENT", "vitest --ui は常駐 UI サーバー"); return; }

      // ── C. 追従・長時間待機 ─────────────────────────────────
      if (head === "tail" && has("-f", "-F", "--follow")) { out("FOLLOW", "tail -f はログ追従"); return; }
      if ((head === "docker" || head === "kubectl") && args.includes("logs") && has("-f", "--follow")) {
        out("FOLLOW", head + " logs -f はログ追従");
        return;
      }
      if (head === "gh" && args[0] === "run" && args[1] === "watch") { out("FOLLOW", "gh run watch は CI 完了まで待機"); return; }
      if (head === "vercel" && args.includes("logs") && has("-f", "--follow")) { out("FOLLOW", "vercel logs --follow はログ追従"); return; }
      if (head === "sleep") {
        const sec = parseFloat(args[0]);
        if (Number.isFinite(sec) && sec >= 60) { out("FOLLOW", "sleep " + args[0] + " 秒の長時間待機"); return; }
      }
    }

    console.log("OK");
  });
' 2>/dev/null || echo "OK")

KIND=$(printf '%s' "$RESULT" | cut -f1)
REASON=$(printf '%s' "$RESULT" | cut -f2-)

[ "$KIND" = "OK" ] && exit 0
[ "$KIND" != "BROWSER" ] && [ "$KIND" != "RESIDENT" ] && [ "$KIND" != "FOLLOW" ] && exit 0

case "$KIND" in
  BROWSER)
    TITLE="ブラウザ自動操作はブロックされました"
    ADVICE=$(cat <<'A'
AI エージェントはブラウザを自動操作しません。
1 操作ごとに拡張・外部プロセスとの往復が発生し、遅く不安定で、
繰り返すと作業が長時間停止したように見えるためです。

✅ AI の確認範囲は品質ゲートまで:

    pnpm build       # 型・ビルドエラーを検出
    pnpm validate    # lint + typecheck + test + 境界チェック
    pnpm test        # ユニット / 回帰テスト

✅ 実画面の確認は人間が行う:

    確認してほしい点を箇条書きで報告し、ユーザーに見てもらうこと。
    自分で本番URLを開いて測定しない。
A
)
    ;;
  RESIDENT)
    TITLE="常駐プロセスの起動はブロックされました"
    ADVICE=$(cat <<'A'
常駐プロセスはフォアグラウンドでターミナルを占有し、
エージェントの作業がそこで停止します。

✅ ワンショットで完了するコマンドに置き換えてください:

    pnpm build       # ビルド確認（サーバー起動の代わり）
    pnpm test        # vitest run（watch ではなく単発実行）
    pnpm validate    # lint + typecheck + test + 境界チェック

どうしても常駐起動が必要な場合は自分で実行せず、ユーザーに依頼すること。
A
)
    ;;
  FOLLOW)
    TITLE="ログ追従・長時間待機はブロックされました"
    ADVICE=$(cat <<'A'
追従・待機系のコマンドは終了条件が外部にあり、戻ってこないため
エージェントの作業が停止します。

✅ ワンショット取得に置き換えてください:

    tail -n 200 <file>       # -f ではなく末尾N行
    gh run list / gh run view  # watch ではなく現在状態を1回取得
    vercel logs              # --follow を付けない
    docker compose up -d     # デタッチして起動し、別途 logs を1回取得

状態が変わるまで待つ必要がある場合は、待たずに一旦報告し、
ユーザーの指示を仰ぐこと。
A
)
    ;;
esac

cat >&2 <<BLOCKMSG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ ${TITLE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

検出: ${REASON}

${ADVICE}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BLOCKMSG

exit 2
