#!/usr/bin/env bash
# ============================================================
# reload-https.sh
# ------------------------------------------------------------
# 作用：写入 Caddy 配置，把域名 HTTPS 反代到本机前端端口
# 前置：
#   1) DNS A 记录已指向本机公网 IP
#   2) 防火墙已放行 80 / 443
#   3) 前端容器已在 127.0.0.1:3000 监听；后端在 127.0.0.1:8000
# 用法：
#   chmod +x scripts/reload-https.sh
#   ./scripts/reload-https.sh
# ============================================================

set -euo pipefail

# ===== 按你的实际情况修改 =====
DOMAIN="videograb.codedance.work"
FRONTEND="127.0.0.1:3000"
BACKEND="127.0.0.1:8000"
# ==============================

echo "[1/3] 写入 /etc/caddy/Caddyfile（域名: ${DOMAIN}）..."
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
${DOMAIN} {
    encode gzip

    # 探活直达后端（不经前端，前端挂了也能报 backend 状态）
    handle /health {
        reverse_proxy ${BACKEND}
    }

    handle {
        reverse_proxy ${FRONTEND} {
            # SSE / 长连接：关闭缓冲，避免进度卡住
            flush_interval -1
            transport http {
                read_timeout 3600s
                write_timeout 3600s
            }
        }
    }
}

# 可选：保留 http://公网IP 访问
:80 {
    handle /health {
        reverse_proxy ${BACKEND}
    }
    handle {
        reverse_proxy ${FRONTEND} {
            flush_interval -1
        }
    }
}
EOF

echo "[2/3] 重载 Caddy..."
sudo systemctl reload caddy

echo "[3/3] 查看状态（前 20 行）..."
sudo systemctl status caddy --no-pager | sed -n '1,20p'

echo
echo "完成。请浏览器访问：https://${DOMAIN}"
echo "健康检查：https://${DOMAIN}/health  → 期望 {\"status\":\"ok\"}"
echo "若证书失败，执行：sudo journalctl -u caddy -n 80 --no-pager"
