#!/usr/bin/env bash
# ============================================================
# upload-cookies.sh
# ------------------------------------------------------------
# 运维：把 Netscape 格式 cookies.txt 装到 secrets/ 并让 backend 生效
# 用法：
#   ./scripts/upload-cookies.sh /path/to/cookies.txt
#       → 写入本机仓库 ./secrets/cookies.txt，并 recreate backend（若 compose 可用）
#   ./scripts/upload-cookies.sh /path/to/cookies.txt ubuntu@HOST
#       → scp 到 HOST:/opt/videograb/secrets/cookies.txt 并远程 recreate
#
# 环境变量（可选）：
#   APP_DIR          远端项目目录，默认 /opt/videograb
#   COMPOSE_CMD      远端 compose 命令覆盖
# ============================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="${APP_DIR:-/opt/videograb}"
SRC="${1:-}"
SSH_TARGET="${2:-}"

usage() {
  cat <<'EOF'
用法:
  ./scripts/upload-cookies.sh <cookies.txt> [user@host]

示例:
  ./scripts/upload-cookies.sh ~/Downloads/www.bilibili.com_cookies.txt
  ./scripts/upload-cookies.sh ./cookies.txt ubuntu@43.128.104.104
EOF
}

if [[ -z "${SRC}" || "${SRC}" == "-h" || "${SRC}" == "--help" ]]; then
  usage
  exit 1
fi

if [[ ! -f "${SRC}" ]]; then
  echo "错误：找不到文件 ${SRC}"
  exit 1
fi

# 粗校验 Netscape / cookies.txt（至少有一行含域名分隔字段，或标准头）
if ! grep -qE '^(# (Netscape|HTTP Cookie File)|[^#[:space:]].*[[:space:]].*[[:space:]])' "${SRC}"; then
  echo "警告：内容不太像 Netscape cookies.txt，仍将继续上传。"
  echo "请确认用浏览器扩展导出的是 Netscape 格式（非 JSON）。"
fi

install_local() {
  local dest="$1"
  mkdir -p "$(dirname "${dest}")"
  cp "${SRC}" "${dest}"
  chmod 600 "${dest}"
  echo "已写入 ${dest} ($(wc -c <"${dest}" | tr -d ' ') bytes)"
}

recreate_backend() {
  local dir="$1"
  (
    cd "${dir}"
    local files=(-f docker-compose.yml)
    if [[ -f docker-compose.prod.yml ]]; then
      files+=(-f docker-compose.prod.yml)
    fi
    if ! command -v docker >/dev/null 2>&1; then
      echo "未检测到 docker。文件已就位；本地 ./dev.sh 可在 backend/.env 设："
      echo "  COOKIES_FILE=${dir}/secrets/cookies.txt"
      return 0
    fi
    if ! docker compose "${files[@]}" ps --status running 2>/dev/null | grep -q backend; then
      echo "未检测到运行中的 compose backend，跳过 recreate。"
      echo "Docker 部署后执行："
      echo "  docker compose ${files[*]} up -d --force-recreate --no-deps backend"
      echo "本地 ./dev.sh 可在 backend/.env 设 COOKIES_FILE=${dir}/secrets/cookies.txt"
      return 0
    fi
    echo "重启 backend 以加载 Cookie..."
    docker compose "${files[@]}" up -d --force-recreate --no-deps backend
    echo "验证容器内文件："
    docker compose "${files[@]}" exec -T backend sh -c \
      'if [ -f /secrets/cookies.txt ]; then echo "OK: /secrets/cookies.txt present"; else echo "MISSING: /secrets/cookies.txt"; exit 1; fi'
  )
}

if [[ -z "${SSH_TARGET}" ]]; then
  DEST="${ROOT}/secrets/cookies.txt"
  install_local "${DEST}"
  recreate_backend "${ROOT}"
else
  echo "上传到 ${SSH_TARGET}:${APP_DIR}/secrets/cookies.txt ..."
  ssh "${SSH_TARGET}" "mkdir -p '${APP_DIR}/secrets' && chmod 700 '${APP_DIR}/secrets'"
  scp "${SRC}" "${SSH_TARGET}:${APP_DIR}/secrets/cookies.txt"
  ssh "${SSH_TARGET}" "chmod 600 '${APP_DIR}/secrets/cookies.txt'"
  echo "远端重启 backend..."
  ssh "${SSH_TARGET}" bash -s <<EOF
set -euo pipefail
cd '${APP_DIR}'
files=(-f docker-compose.yml)
if [[ -f docker-compose.prod.yml ]]; then
  files+=(-f docker-compose.prod.yml)
fi
docker compose "\${files[@]}" up -d --force-recreate --no-deps backend
docker compose "\${files[@]}" exec -T backend sh -c \\
  'if [ -f /secrets/cookies.txt ]; then echo "OK: /secrets/cookies.txt present"; else echo "MISSING: /secrets/cookies.txt"; exit 1; fi'
EOF
fi

echo
echo "完成。用一条 B站公开视频链接测解析；若仍 412，Cookie 可能过期或账号被风控，请重新导出。"
