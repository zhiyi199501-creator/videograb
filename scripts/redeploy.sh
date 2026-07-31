#!/usr/bin/env bash
# ============================================================
# redeploy.sh
# ------------------------------------------------------------
# 作用：重建并启动 VideoGrab 前后端容器
# 前置：已在 /opt/videograb，且 docker-compose.yml / .env 配好
# 用法：
#   chmod +x scripts/redeploy.sh
#   ./scripts/redeploy.sh            # 只重建，不拉代码
#   ./scripts/redeploy.sh --pull     # 先 git pull，再重建
# ============================================================

set -euo pipefail

APP_DIR="/opt/videograb"

if [[ ! -d "${APP_DIR}" ]]; then
  echo "错误：找不到 ${APP_DIR}，请先按文档把项目放到该目录。"
  exit 1
fi

cd "${APP_DIR}"

if [[ "${1:-}" == "--pull" ]]; then
  echo "[1/3] git pull ..."
  git pull
else
  echo "[1/3] 跳过 git pull（需要更新代码请加参数 --pull）"
fi

COMPOSE_FILES=(-f docker-compose.yml)
if [[ -f docker-compose.prod.yml ]]; then
  COMPOSE_FILES+=(-f docker-compose.prod.yml)
  echo "[2/3] 使用生产覆盖：docker-compose.yml + docker-compose.prod.yml"
else
  echo "[2/3] 未找到 docker-compose.prod.yml，仅使用 docker-compose.yml"
fi

docker compose "${COMPOSE_FILES[@]}" up -d --build --force-recreate

echo "[3/3] 当前容器："
docker compose "${COMPOSE_FILES[@]}" ps

echo
echo "完成。常用排查命令："
echo "  docker compose ${COMPOSE_FILES[*]} logs -f --tail=100 frontend"
echo "  docker compose ${COMPOSE_FILES[*]} logs -f --tail=100 backend"
