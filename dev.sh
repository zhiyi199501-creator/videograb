#!/usr/bin/env bash
# 一键启动本地前后端开发环境
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8000}"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "正在停止服务…"
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "已停止"
}
trap cleanup EXIT INT TERM

# --- 后端 ---
if [[ ! -d "$BACKEND/.venv" ]]; then
  echo "创建 Python 虚拟环境…"
  python3 -m venv "$BACKEND/.venv"
fi

# shellcheck disable=SC1091
source "$BACKEND/.venv/bin/activate"

if ! python -c "import fastapi" 2>/dev/null; then
  echo "安装后端依赖…"
  pip install -r "$BACKEND/requirements.txt"
fi

if [[ ! -f "$BACKEND/.env" && -f "$BACKEND/.env.example" ]]; then
  cp "$BACKEND/.env.example" "$BACKEND/.env"
  echo "已从 .env.example 生成 backend/.env，请按需填写密钥"
fi

echo "启动后端 → http://localhost:8000"
(
  cd "$BACKEND"
  exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
) &
BACKEND_PID=$!

# --- 前端 ---
if [[ ! -d "$FRONTEND/node_modules" ]]; then
  echo "安装前端依赖…"
  (cd "$FRONTEND" && npm install)
fi

echo "启动前端 → http://localhost:3000"
(
  cd "$FRONTEND"
  exec env NEXT_PUBLIC_API_URL="$API_URL" npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:8000"
echo "  按 Ctrl+C 同时停止"
echo "========================================"
echo ""

wait
