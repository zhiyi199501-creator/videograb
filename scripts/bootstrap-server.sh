#!/usr/bin/env bash
# ============================================================
# bootstrap-server.sh
# ------------------------------------------------------------
# 作用：新服务器首次初始化（装 Docker + 拉代码目录准备）
# 说明：在「已 SSH 登录的 ubuntu 用户」下执行
# 用法：
#   chmod +x scripts/bootstrap-server.sh
#   ./scripts/bootstrap-server.sh
# 注意：执行后若 docker 权限报错，请 exit 后重新 SSH 登录一次
# ============================================================

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/zhiyi199501-creator/videograb.git}"
APP_DIR="/opt/videograb"

echo "[1/4] 安装基础依赖与 Docker..."
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"

echo "[2/4] 准备项目目录 ${APP_DIR} ..."
sudo mkdir -p "${APP_DIR}"
sudo chown -R "$USER:$USER" "${APP_DIR}"

echo "[3/4] 克隆代码（若目录已有 .git 则跳过）..."
if [[ -d "${APP_DIR}/.git" ]]; then
  echo "已存在 Git 仓库，跳过 clone。"
else
  git clone "${REPO_URL}" "${APP_DIR}"
fi

echo "[4/4] 版本检查："
docker --version || true
docker compose version || true

echo
echo "完成。"
echo "下一步："
echo "  1) exit 后重新 ssh 登录（让 docker 组生效）"
echo "  2) cd ${APP_DIR} && cp backend/.env.example backend/.env && nano backend/.env"
echo "  3) 按 docs/deploy-online-guide.md 修改 compose / Dockerfile"
echo "  4) docker compose up -d --build"
