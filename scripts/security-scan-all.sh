#!/bin/bash
# ═══════════════════════════════════════════════════
# 全リポジトリ gitleaks 診断スクリプト
# 読み取り専用 - コードは一切変更しません
# ═══════════════════════════════════════════════════

set -euo pipefail

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

GITHUB_DIR="$HOME/Documents/GitHub"
REPORT_FILE="$GITHUB_DIR/security-scan-report-$(date +%Y%m%d-%H%M%S).txt"

# gitleaks確認
if ! command -v gitleaks &> /dev/null; then
  echo -e "${RED}エラー: gitleaksがインストールされていません${NC}"
  echo "インストール: brew install gitleaks"
  exit 1
fi

echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  全リポジトリ セキュリティスキャン${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}スキャン対象:${NC} $GITHUB_DIR"
echo -e "${BLUE}レポート出力:${NC} $REPORT_FILE"
echo ""

# カウンター
total=0
clean=0
leaked=0
skipped=0
public_leaked=0

# レポートヘッダー
{
  echo "═══════════════════════════════════════════════"
  echo "  セキュリティスキャンレポート"
  echo "  実行日時: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "═══════════════════════════════════════════════"
  echo ""
} > "$REPORT_FILE"

# 公開リポジトリリスト取得
PUBLIC_REPOS=""
if command -v gh &> /dev/null; then
  PUBLIC_REPOS=$(gh repo list --public --json name --jq '.[].name' 2>/dev/null || echo "")
fi

# 全ディレクトリをスキャン
for dir in "$GITHUB_DIR"/*/; do
  [ ! -d "$dir/.git" ] && continue

  repo_name=$(basename "$dir")
  total=$((total + 1))

  # 公開リポジトリかどうか判定
  is_public="private"
  if echo "$PUBLIC_REPOS" | grep -qx "$repo_name" 2>/dev/null; then
    is_public="PUBLIC"
  fi

  printf "  [%02d] %-35s [%s] " "$total" "$repo_name" "$is_public"

  # gitleaksスキャン
  scan_output=$(gitleaks git -s "$dir" --no-banner 2>&1) || true
  scan_exit=$?

  if echo "$scan_output" | grep -q "no leaks found"; then
    echo -e "${GREEN}✅ クリーン${NC}"
    echo "  ✅ [$is_public] $repo_name - クリーン" >> "$REPORT_FILE"
    clean=$((clean + 1))
  elif echo "$scan_output" | grep -q "leaks found"; then
    leak_count=$(echo "$scan_output" | grep -oP '\d+ leaks?' | head -1 || echo "検出あり")
    echo -e "${RED}🚨 秘密情報検出: $leak_count${NC}"
    {
      echo ""
      echo "  🚨 [$is_public] $repo_name - 秘密情報検出"
      echo "  詳細:"
      gitleaks git -s "$dir" --no-banner -v 2>&1 | head -50
      echo ""
    } >> "$REPORT_FILE"
    leaked=$((leaked + 1))
    if [ "$is_public" = "PUBLIC" ]; then
      public_leaked=$((public_leaked + 1))
    fi
  else
    echo -e "${YELLOW}⚠️ スキップ（スキャン不可）${NC}"
    echo "  ⚠️ [$is_public] $repo_name - スキャン不可" >> "$REPORT_FILE"
    skipped=$((skipped + 1))
  fi
done

# サマリー
echo ""
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  スキャン結果サマリー${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  スキャン数:     ${BOLD}$total${NC} リポジトリ"
echo -e "  ${GREEN}クリーン:     $clean${NC}"
echo -e "  ${RED}秘密情報検出: $leaked${NC}"
if [ "$public_leaked" -gt 0 ]; then
  echo -e "  ${RED}${BOLD}⚠️ 公開リポジトリの流出: $public_leaked （要緊急対応）${NC}"
fi
echo -e "  ${YELLOW}スキップ:     $skipped${NC}"
echo ""
echo -e "レポート: ${BLUE}$REPORT_FILE${NC}"

# レポートフッター
{
  echo ""
  echo "═══════════════════════════════════════════════"
  echo "  サマリー"
  echo "  スキャン: $total / クリーン: $clean / 検出: $leaked / スキップ: $skipped"
  if [ "$public_leaked" -gt 0 ]; then
    echo "  ⚠️ 公開リポジトリの流出: $public_leaked （要緊急対応）"
  fi
  echo "═══════════════════════════════════════════════"
} >> "$REPORT_FILE"

# 警告
if [ "$leaked" -gt 0 ]; then
  echo ""
  echo -e "${RED}${BOLD}⚠️ 秘密情報が検出されました！${NC}"
  echo -e "レポートを確認し、以下の対応を行ってください："
  echo -e "  1. ${BOLD}該当キー・パスワードを即座に無効化・再発行${NC}"
  echo -e "  2. git-filter-repo で履歴から削除"
  echo -e "  3. .gitignore に追加して再発防止"
  if [ "$public_leaked" -gt 0 ]; then
    echo ""
    echo -e "  ${RED}${BOLD}🚨 公開リポジトリの流出は最優先で対応してください！${NC}"
  fi
fi
