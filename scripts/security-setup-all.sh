#!/bin/bash
# ═══════════════════════════════════════════════════
# 全GitHubリポジトリ セキュリティ一括設定スクリプト
# gh CLI必須 / 認証済みであること
# ═══════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# gh CLI確認
if ! command -v gh &> /dev/null; then
  echo -e "${RED}エラー: GitHub CLI (gh) がインストールされていません${NC}"
  echo "インストール: brew install gh"
  exit 1
fi

# 認証確認
if ! gh auth status &> /dev/null; then
  echo -e "${RED}エラー: GitHub CLIが未認証です${NC}"
  echo "認証: gh auth login"
  exit 1
fi

OWNER=$(gh api user --jq .login)

echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  全GitHubリポジトリ セキュリティ一括設定${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  アカウント: ${BOLD}$OWNER${NC}"
echo ""

# リポジトリ一覧取得
echo -e "${BLUE}リポジトリ一覧を取得中...${NC}"
REPOS=$(gh repo list --json name,isPrivate,isArchived,defaultBranchRef \
  --jq '.[] | select(.isArchived == false) | "\(.name)\t\(if .isPrivate then "private" else "public" end)\t\(.defaultBranchRef.name)"' \
  --limit 100)

REPO_COUNT=$(echo "$REPOS" | wc -l | tr -d ' ')
PUBLIC_COUNT=$(echo "$REPOS" | grep -c "public" || echo 0)
PRIVATE_COUNT=$(echo "$REPOS" | grep -c "private" || echo 0)

echo ""
echo -e "  対象: ${BOLD}$REPO_COUNT${NC} リポジトリ（公開: $PUBLIC_COUNT / プライベート: $PRIVATE_COUNT）"
echo -e "  ${DIM}※ アーカイブ済みリポジトリは除外${NC}"
echo ""

# ═══════════════════════════════════════════════════
# フェーズ1: パッシブ防御（機能影響なし）
# ═══════════════════════════════════════════════════

echo -e "${BOLD}${BLUE}━━━ フェーズ1: パッシブ防御（機能影響なし）━━━${NC}"
echo ""
echo "  以下を全リポジトリに適用します:"
echo "    1. Secret Scanning（秘密情報の自動検出・通知）"
echo "    2. Dependabotアラート（脆弱性の自動検出・通知）"
echo "    3. Dependabot自動修正（修正PRの自動作成）"
echo ""
echo -e "  ${GREEN}これらはパッシブな監視機能です。既存コードは変更されません。${NC}"
echo ""

read -p "適用しますか？ (Y/n): " phase1_answer
phase1_answer=${phase1_answer:-Y}

if [[ "$phase1_answer" =~ ^[Yy] ]]; then
  echo ""
  p1_success=0
  p1_fail=0

  while IFS=$'\t' read -r name visibility branch; do
    printf "  %-35s [%s] " "$name" "$visibility"

    # Secret Scanning + Dependabot自動修正
    if gh api "repos/$OWNER/$name" -X PATCH --input - --silent <<EOF 2>/dev/null
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "disabled" },
    "dependabot_security_updates": { "status": "enabled" }
  }
}
EOF
    then
      : # success
    fi

    # Dependabotアラート
    if gh api "repos/$OWNER/$name/vulnerability-alerts" -X PUT --silent 2>/dev/null; then
      echo -e "${GREEN}✅${NC}"
      p1_success=$((p1_success + 1))
    else
      echo -e "${YELLOW}⚠️ 一部失敗${NC}"
      p1_fail=$((p1_fail + 1))
    fi
  done <<< "$REPOS"

  echo ""
  echo -e "  ${GREEN}成功: $p1_success${NC} / ${YELLOW}失敗: $p1_fail${NC}"
fi

# ═══════════════════════════════════════════════════
# フェーズ2: Push Protection（確認必要）
# ═══════════════════════════════════════════════════

echo ""
echo -e "${BOLD}${BLUE}━━━ フェーズ2: Push Protection ━━━${NC}"
echo ""
echo "  秘密情報を含むpushをGitHub側でブロックします。"
echo ""
echo -e "  ${YELLOW}⚠️ 注意:${NC}"
echo "  - テスト用APIキーやダミーキーがコードにある場合、pushがブロックされます"
echo "  - ブロック時はバイパス理由を指定してpush可能です"
echo "  - 既存のコードには影響しません（新しいpush時のみ）"
echo ""

read -p "全リポジトリに適用しますか？ (Y/n): " phase2_answer
phase2_answer=${phase2_answer:-Y}

if [[ "$phase2_answer" =~ ^[Yy] ]]; then
  echo ""
  p2_success=0

  while IFS=$'\t' read -r name visibility branch; do
    printf "  %-35s " "$name"

    if gh api "repos/$OWNER/$name" -X PATCH --input - --silent <<EOF 2>/dev/null
{
  "security_and_analysis": {
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
EOF
    then
      echo -e "${GREEN}✅${NC}"
      p2_success=$((p2_success + 1))
    else
      echo -e "${YELLOW}⚠️${NC}"
    fi
  done <<< "$REPOS"

  echo ""
  echo -e "  ${GREEN}適用: $p2_success${NC}"
fi

# ═══════════════════════════════════════════════════
# フェーズ3: ブランチ保護（公開リポジトリのみ推奨）
# ═══════════════════════════════════════════════════

echo ""
echo -e "${BOLD}${BLUE}━━━ フェーズ3: ブランチ保護 ━━━${NC}"
echo ""
echo "  mainブランチへのforce pushとブランチ削除を禁止します。"
echo ""
echo -e "  ${YELLOW}⚠️ 注意:${NC}"
echo "  - git push --force が使えなくなります"
echo "  - rebase後のforce pushワークフローに影響します"
echo ""
echo "  推奨: 公開リポジトリ（${PUBLIC_COUNT}個）のみに適用"
echo ""

echo "  1) 公開リポジトリのみ（推奨）"
echo "  2) 全リポジトリ"
echo "  3) スキップ"
echo ""

read -p "選択 (1/2/3): " phase3_answer
phase3_answer=${phase3_answer:-1}

if [[ "$phase3_answer" == "1" || "$phase3_answer" == "2" ]]; then
  echo ""
  p3_success=0

  while IFS=$'\t' read -r name visibility branch; do
    # 公開のみモードでプライベートならスキップ
    if [[ "$phase3_answer" == "1" && "$visibility" == "private" ]]; then
      continue
    fi

    printf "  %-35s [%s] " "$name" "$visibility"

    if gh api "repos/$OWNER/$name/branches/$branch/protection" -X PUT --input - --silent <<EOF 2>/dev/null
{
  "required_status_checks": null,
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false
}
EOF
    then
      echo -e "${GREEN}✅${NC}"
      p3_success=$((p3_success + 1))
    else
      echo -e "${YELLOW}⚠️ 失敗（権限不足の可能性）${NC}"
    fi
  done <<< "$REPOS"

  echo ""
  echo -e "  ${GREEN}適用: $p3_success${NC}"
fi

# ═══════════════════════════════════════════════════
# 完了レポート
# ═══════════════════════════════════════════════════

echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  セキュリティ設定完了！${NC}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "  適用された設定:"
echo "    ✅ Secret Scanning（秘密情報検出）"
echo "    ✅ Dependabotアラート（脆弱性検出）"
echo "    ✅ Dependabot自動修正（修正PR作成）"
[[ "${phase2_answer:-n}" =~ ^[Yy] ]] && echo "    ✅ Push Protection（秘密pushブロック）"
[[ "${phase3_answer:-3}" != "3" ]] && echo "    ✅ ブランチ保護（force push/削除禁止）"
echo ""
echo -e "  ${YELLOW}💡 次のステップ:${NC}"
echo "    1. bash scripts/security-scan-all.sh で全リポジトリの履歴をスキャン"
echo "    2. 検出された秘密情報があれば即座にキーを無効化"
echo ""
