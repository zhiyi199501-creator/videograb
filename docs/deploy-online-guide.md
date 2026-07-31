# VideoGrab 海外上线保姆级教程（小白可独立完成）

> 本文根据一次真实上线过程整理。目标：把本地的 VideoGrab（Next.js + FastAPI + Docker）部署到腾讯云轻量服务器，并用子域名开启 HTTPS。  
> 示例环境（请按你自己的实际值替换）：
>
> - 服务器公网 IP：`43.128.104.104`
> - 主域名：`codedance.work`
> - 站点域名：`videograb.codedance.work`
> - 登录用户：`ubuntu`（不是 root）
> - 项目目录：`/opt/videograb`

---

## 0. 你将得到什么

完成后你可以：

1. 用 `https://videograb.codedance.work` 访问网站  
2. 服务器 7×24 运行前后端  
3. 后续可用同一主域名挂更多子项目（如 `blog.codedance.work`）

**不在本文范围（可后做）：**

- Stripe 正式收款
- ICP 备案（海外机 + 海外域名通常不需要）

B站 / 抖音 Cookie 运维见下文「B站 / 抖音 Cookie 运维」。

---

## 1. 准备清单

开始前准备好：

| 项目 | 说明 |
|------|------|
| 腾讯云账号 | 已实名 |
| 海外轻量服务器 | 推荐新加坡，**2 核 4G**，Ubuntu 22.04/24.04 |
| 域名 | 如 `codedance.work`（年费尽量 ≤50） |
| GitHub 仓库 | 项目代码（私有仓库也行） |
| DeepSeek API Key | 若要开 AI 总结 |

### 推荐服务器配置

- CPU：2 核起  
- 内存：**≥ 4GB**（2GB 能启动，但下载/转写容易崩）  
- 磁盘：≥ 40GB  
- 系统：Ubuntu  
- 流量：尽量大（下载站吃出站流量；别买只有 10GB 的“低流量”套餐）

### 为什么选海外

- 不用等 ICP 备案即可用域名对外访问  
- YouTube 等源更容易在服务器侧拉取  
- 大陆用户访问一般**不需要 VPN**（跨境可能偶发慢）

---

## 2. 购买服务器并拿到公网 IP

1. 打开腾讯云 → **轻量应用服务器** → 购买  
2. 地域选 **新加坡**（或香港）  
3. 镜像选 **Ubuntu** 系统镜像（不要选 WordPress 等应用模板）  
4. 套餐选 **2 核 4G**（锐驰型/入门型均可，优先看流量）  
5. 附加商品（HAI、DDoS 包、COS、MPS 转码包）**先全部不选**  
6. 购买完成后，在控制台复制 **公网 IP**

记下：

```text
公网 IP = 你的IP
```

### 防火墙（安全组）先放行

实例详情 → **防火墙**，添加入站规则：

| 端口 | 用途 |
|------|------|
| 22 | SSH 登录 |
| 80 | HTTP / 申请证书 |
| 443 | HTTPS |
| 3000 | 临时调试前端（稳定后可关） |
| 8000 | 临时调试后端（稳定后可关） |

> 正式跑通后，建议只保留 22 / 80 / 443，不要长期裸奔 3000/8000。

---

## 3. 用 SSH 登录服务器

在你自己的电脑（Mac / Windows 终端）执行：

```bash
# 第一次连接会问是否信任主机指纹，输入 yes 回车
ssh ubuntu@你的公网IP
```

常见坑：

1. **`root@IP` 连不上 / Connection closed**  
   腾讯云 Ubuntu 默认常用用户是 `ubuntu`，请用：
   ```bash
   ssh ubuntu@你的公网IP
   ```
2. 密码输入时屏幕**不显示任何字符**，这是正常现象，输完回车即可。  
3. 密码不对可到控制台 **重置密码**，等 1–2 分钟再试。

登录成功后提示符类似：

```text
ubuntu@VM-xxxx:~$
```

---

## 4. 安装 Docker（整段复制）

```bash
# 更新软件源，安装基础工具，安装 Docker，并把当前用户加入 docker 组
sudo apt update && \
sudo apt install -y ca-certificates curl git && \
curl -fsSL https://get.docker.com | sudo sh && \
sudo usermod -aG docker $USER
```

验证：

```bash
docker --version
docker compose version
```

如果提示 `permission denied`（访问 docker.sock 失败）：

```bash
# 加组后必须重新登录一次才生效
exit
ssh ubuntu@你的公网IP

# 确认 groups 输出里有 docker
groups
```

---

## 5. 拉取项目代码

```bash
# 创建项目目录，并交给当前用户
sudo mkdir -p /opt/videograb
sudo chown -R $USER:$USER /opt/videograb
cd /opt/videograb

# 换成你的仓库地址
git clone https://github.com/你的账号/videograb.git .
```

> 末尾的 `.` 表示“克隆到当前目录”，不要省略。

---

## 6. 配置后端环境变量

```bash
cd /opt/videograb
cp backend/.env.example backend/.env
nano backend/.env
```

至少修改：

```bash
# DeepSeek（AI 总结用；暂时不用可先留空，但功能会不可用）
DEEPSEEK_API_KEY=sk-你的真实key

# 生产环境务必换成长随机串（不要用示例里的弱密钥）
JWT_SECRET=请换成很长的随机字符串

# 先写 IP；有 HTTPS 域名后再改成 https://videograb.codedance.work
FRONTEND_URL=http://你的公网IP
```

生成随机密钥示例：

```bash
openssl rand -hex 32
```

保存退出：`Ctrl + O` → 回车 → `Ctrl + X`

权限建议：

```bash
chmod 600 backend/.env
```

---

## 7. 通用配置 + 生产覆盖（重要）

仓库已拆成两层，避免把个人正式域名写死进默认文件：

| 文件 | 用途 |
|------|------|
| `docker-compose.yml` | 通用默认：空 `NEXT_PUBLIC_API_URL`、`BACKEND_URL=http://backend:8000` |
| `docker-compose.prod.yml` | 生产覆盖：正式域名、CORS、`FRONTEND_URL` |
| `frontend/Dockerfile` | 构建时接收 `BACKEND_URL`（避免固化成 `127.0.0.1`） |

生产部署有两个高频坑：

1. `NEXT_PUBLIC_API_URL=http://localhost:8000`  
   → 浏览器会去访问**用户自己电脑**，出现 `Failed to fetch`
2. 前端代理默认 `BACKEND_URL=http://127.0.0.1:8000`  
   → 在容器里 `127.0.0.1` 是前端自己，不是后端容器，出现 `ECONNREFUSED 127.0.0.1:8000`

### 7.1 确认 / 修改生产覆盖

```bash
cd /opt/videograb
nano docker-compose.prod.yml
```

把里面的域名改成你的（示例）：

```yaml
services:
  backend:
    environment:
      - FRONTEND_URL=https://videograb.codedance.work
      - CORS_ORIGINS=https://videograb.codedance.work,http://frontend:3000
  frontend:
    build:
      args:
        - NEXT_PUBLIC_API_URL=
        - NEXT_PUBLIC_SITE_URL=https://videograb.codedance.work
        - BACKEND_URL=http://backend:8000
    environment:
      - NEXT_PUBLIC_API_URL=
      - NEXT_PUBLIC_SITE_URL=https://videograb.codedance.work
      - BACKEND_URL=http://backend:8000
```

同时确认 `frontend/Dockerfile` 在 `RUN npm run build` 前有：

```dockerfile
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=$BACKEND_URL
```

> 本地调试继续用 `./dev.sh`，不受这些 Docker 配置影响。

---

## 8. 首次启动

```bash
cd /opt/videograb

# 生产：必须叠加上面的 prod 覆盖文件
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 查看容器状态（应为 Up）
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

> 若只跑 `docker compose up`（不带 prod），也能起来，但站点 URL / Checkout 回跳仍是占位域名。

期望看到：

- `videograb-backend-1` → `0.0.0.0:8000->8000`
- `videograb-frontend-1` → `0.0.0.0:3000->3000`

自检：

```bash
# 在服务器本机测（通了说明容器正常）
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1:8000/docs
```

浏览器先试：

- `http://你的公网IP:3000`

如果外网打不开，回去检查防火墙是否放行 **3000**。

---

## 9. 配置 80 端口（Caddy 反代）

### 什么是 Caddy 反代（一句话）

用户访问 `80/443`（域名或 IP），Caddy 再把请求转给内部 `3000`。  
好处：不用带 `:3000`，还能自动申请 HTTPS 证书。

### 9.1 安装 Caddy

```bash
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

# 添加 Caddy 官方源
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  sudo tee /etc/apt/sources.list.d/caddy-stable.list

sudo apt update
sudo apt install -y caddy
```

### 9.2 先用 IP 的 80 端口（可选，方便先验证）

```bash
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
# 监听 80，把流量转到本机前端容器 3000
:80 {
    encode gzip
    reverse_proxy 127.0.0.1:3000 {
        # SSE / 长连接：关闭缓冲
        flush_interval -1
        transport http {
            read_timeout 3600s
            write_timeout 3600s
        }
    }
}
EOF

sudo systemctl enable caddy
sudo systemctl restart caddy
sudo systemctl status caddy --no-pager
```

浏览器打开：

- `http://你的公网IP`

---

## 10. 注册域名并解析

### 10.1 买域名

示例：`codedance.work`  
购买前看清 **续费价**，尽量控制在预算内。

### 10.2 等审核

腾讯云域名可能显示「命名审核中」，变 **正常** 后再继续。

### 10.3 添加 DNS 解析（DNSPod）

目标：`videograb.codedance.work` → 服务器

| 主机记录 | 记录类型 | 记录值 |
|---------|----------|--------|
| `videograb` | A | `你的公网IP` |

可选（门户站以后再用）：

| 主机记录 | 记录类型 | 记录值 |
|---------|----------|--------|
| `@` | A | `你的公网IP` |
| `www` | A | `你的公网IP` |

本机验证：

```bash
ping videograb.codedance.work
# 或
nslookup videograb.codedance.work
```

应解析到你的服务器 IP。

---

## 11. 开启 HTTPS（正式域名）

确认防火墙已放行 **80、443**，且解析已生效后执行：

```bash
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
# 正式站点：自动申请 Let's Encrypt 证书
videograb.codedance.work {
    encode gzip
    reverse_proxy 127.0.0.1:3000 {
        flush_interval -1
        transport http {
            read_timeout 3600s
            write_timeout 3600s
        }
    }
}

# 可选：继续保留 IP:80 访问
:80 {
    reverse_proxy 127.0.0.1:3000 {
        flush_interval -1
    }
}
EOF

sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

浏览器打开：

- `https://videograb.codedance.work`

应看到小锁图标。

证书失败时查看：

```bash
sudo journalctl -u caddy -n 80 --no-pager
```

常见原因：DNS 未生效、80/443 未放行、域名审核未过。

---

## 12. 把项目配置改成正式域名

```bash
cd /opt/videograb
nano backend/.env
```

改：

```bash
FRONTEND_URL=https://videograb.codedance.work
```

再确认 `docker-compose.prod.yml` 里的 `NEXT_PUBLIC_SITE_URL` / `FRONTEND_URL` 一致。

重建（`NEXT_PUBLIC_*` 和 `BACKEND_URL` 变更后必须重新 build）：

```bash
cd /opt/videograb
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --force-recreate
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

---

## 13. 上线验收清单

- [ ] `https://你的子域名` 能打开，有 HTTPS 小锁  
- [ ] 粘贴链接能解析（非 B站/抖音也可先测）  
- [ ] 下载进度能走（SSE 正常）  
- [ ] 登录/注册可用（若已开会员）  
- [ ] `backend/.env` 未提交到 Git  
- [ ] `JWT_SECRET` 已不是开发默认值  
- [ ] 防火墙不必长期开放 3000/8000  
- [ ] （可选）B站/抖音：已上传 `secrets/cookies.txt` 且未进 Git  

---

## 14. 日常更新代码

本机改完并推送到 GitHub 后，服务器：

```bash
cd /opt/videograb
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# 或：./scripts/redeploy.sh --pull
```

只改了 `backend/.env`：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate backend
```

只更新了 Cookie（本机已有导出文件）：

```bash
# 在开发机执行（会 scp 到服务器并 recreate backend，无需全量 rebuild）
./scripts/upload-cookies.sh ~/Downloads/cookies.txt ubuntu@你的服务器IP
```

改了 `NEXT_PUBLIC_*` 或 `BACKEND_URL` / `docker-compose.prod.yml`：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --force-recreate frontend
```

### 14.1 服务器有手改文件，`git pull` 失败时

若提示类似：

```text
error: Your local changes to the following files would be overwritten by merge:
  docker-compose.yml
  frontend/Dockerfile
```

说明服务器上还有未提交的手改，而 GitHub 已包含正式修复。**通常应丢弃服务器手改、以仓库为准**（密钥在 `backend/.env`，一般不被 Git 跟踪，不会被清掉）。

**推荐（只丢弃冲突文件）：**

```bash
cd /opt/videograb
git checkout -- docker-compose.yml frontend/Dockerfile
# 若还有其它被提示的冲突文件，一并 checkout
git pull
ls docker-compose.prod.yml   # 确认生产覆盖文件已存在
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**更强对齐（清掉全部未提交改动，慎用）：**

```bash
cd /opt/videograb
ls backend/.env              # 先确认 .env 还在
git fetch origin
git reset --hard origin/main
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

> `reset --hard` 会丢掉服务器上所有未提交改动。执行前确认没有还没备份的自定义修改；`.env` / `cookies.txt` 若不在 Git 里，一般仍会保留。

若 `git pull` 成功但报 `open .../docker-compose.prod.yml: no such file`，说明还没拉到含该文件的提交，先按上面方式对齐到 `origin/main` 再启动。

---

## 14.2 B站 / 抖音 Cookie 运维

生产容器**没有**本机 Chrome，不要设 `COOKIES_FROM_BROWSER`。正确做法：运维导出 Netscape `cookies.txt`，放到服务器 `secrets/cookies.txt`（只读挂载进容器 `/secrets/cookies.txt`；yt-dlp 回写时后端会自动复制到可写临时文件）。

Compose 已默认：

- 环境变量 `COOKIES_FILE=/secrets/cookies.txt`
- 卷 `./secrets:/secrets:ro`（保持只读；勿改成让进程直接改 secrets）

文件不存在时下载仍可用，只是 B站/抖音更容易 412。

### 步骤

1. **专用小号**登录 B站（和/或抖音），避免用主账号。
2. 浏览器安装可导出 **Netscape** 格式的扩展（如 Chrome「Get cookies.txt LOCALLY」），导出为 `cookies.txt`（不要 JSON）。
3. **先保证服务器已拉到含 secrets 挂载的代码**，再上传：

```bash
# 本机执行（替换 IP）
./scripts/upload-cookies.sh ~/Downloads/cookies.txt ubuntu@你的服务器IP
```

脚本会：`scp` → `chmod 600` → `docker compose ... up -d --force-recreate --no-deps backend`，并检查容器内文件是否存在。

或在服务器上手动：

```bash
cd /opt/videograb
mkdir -p secrets && chmod 700 secrets
# 把 cookies.txt 拷到 secrets/cookies.txt 后：
chmod 600 secrets/cookies.txt
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate --no-deps backend
```

4. 用一条 B站公开视频测解析。后端日志应出现 `yt-dlp cookiefile enabled: /secrets/cookies.txt`。

### 注意

- `secrets/cookies.txt` **等同登录凭证**，已在 `.gitignore`，勿提交、勿贴到聊天/工单。
- Cookie 会过期；再次 412 时重新导出并跑 upload 脚本即可（无需全量 rebuild）。
- YouTube 路径**不会**使用该 Cookie（避免 SABR/403）；仅非 YouTube 平台启用。
- 账号若因机房 IP 被风控，换小号或接受部分平台不可用。

---

## 15. 常见问题速查

### Q0: `git pull` 报 local changes would be overwritten / 缺少 `docker-compose.prod.yml`

见上文 [14.1](#141-服务器有手改文件git-pull-失败时)：先丢掉服务器手改再 pull，再用双文件 compose 启动。

### Q1: 页面能开，点解析报 `Failed to fetch`

前端还在请求 `localhost:8000`。  
把 `NEXT_PUBLIC_API_URL` 置空，用 prod 文件重建前端：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate frontend
```

### Q2: 日志出现 `ECONNREFUSED 127.0.0.1:8000`

前端容器把 API 代理到了自己。  
确保构建参数 `BACKEND_URL=http://backend:8000`（Dockerfile + compose），并 **无缓存重建**：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate frontend
```

验证：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec frontend printenv | grep BACKEND_URL
# 期望：BACKEND_URL=http://backend:8000
```

### Q3: B站 / 抖音提示 HTTP 412 或需要 Cookie

这是平台风控，不是服务器挂了。按 [14.2 B站 / 抖音 Cookie 运维](#142-b站--抖音-cookie-运维) 上传 Netscape `cookies.txt` 即可。  
不要用容器内的 `COOKIES_FROM_BROWSER=chrome`（容器没有浏览器用户数据）。

### Q4: `COOKIES_FROM_BROWSER=chrome` 报找不到 `/root/.config/google-chrome`

服务器容器里没有浏览器。请改用运维上传 `secrets/cookies.txt`（见 [14.2](#142-b站--抖音-cookie-运维)），并确保 `backend/.env` 里**不要**设置 `COOKIES_FROM_BROWSER`。

### Q5: 一个域名能挂多个项目吗？

可以。推荐子域名：

- `videograb.codedance.work` → 本项目（3000）  
- `blog.codedance.work` → 另一个项目（例如 3001）  

在 Caddy 里按域名分流即可。注意 4G 内存别堆太多重项目。

---

## 16. 可复制一键脚本（可选）

下面脚本适合“代码已在 `/opt/videograb`、域名已解析好”的场景。  
**请先用编辑器改脚本顶部变量**，再执行。

保存为服务器上的 `/opt/videograb/scripts/reload-https.sh`：

```bash
#!/usr/bin/env bash
# ============================================================
# 作用：重载 Caddy，把指定域名 HTTPS 反代到本机 3000
# 使用前：先确认 DNS 已指向本机，且防火墙放行 80/443
# 用法：
#   chmod +x /opt/videograb/scripts/reload-https.sh
#   /opt/videograb/scripts/reload-https.sh
# ============================================================

set -euo pipefail

# ===== 按你的实际情况修改 =====
DOMAIN="videograb.codedance.work"
UPSTREAM="127.0.0.1:3000"
# ==============================

echo "[1/3] 写入 /etc/caddy/Caddyfile ..."
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
${DOMAIN} {
    encode gzip
    reverse_proxy ${UPSTREAM} {
        flush_interval -1
        transport http {
            read_timeout 3600s
            write_timeout 3600s
        }
    }
}

:80 {
    reverse_proxy ${UPSTREAM} {
        flush_interval -1
    }
}
EOF

echo "[2/3] 重载 Caddy ..."
sudo systemctl reload caddy

echo "[3/3] 检查服务状态 ..."
sudo systemctl status caddy --no-pager | sed -n '1,20p'

echo
echo "完成。请浏览器访问：https://${DOMAIN}"
```

重建并启动项目脚本示例 `/opt/videograb/scripts/redeploy.sh`：

```bash
#!/usr/bin/env bash
# ============================================================
# 作用：拉取最新代码（可选）并重建前后端
# 用法：
#   chmod +x /opt/videograb/scripts/redeploy.sh
#   /opt/videograb/scripts/redeploy.sh           # 不拉代码，只重建
#   /opt/videograb/scripts/redeploy.sh --pull    # 先 git pull 再重建
# ============================================================

set -euo pipefail

APP_DIR="/opt/videograb"
cd "${APP_DIR}"

if [[ "${1:-}" == "--pull" ]]; then
  echo "[1/3] git pull ..."
  git pull
else
  echo "[1/3] 跳过 git pull（如需更新代码请加 --pull）"
fi

echo "[2/3] docker compose build & up ..."
docker compose up -d --build --force-recreate

echo "[3/3] 当前容器状态："
docker compose ps

echo
echo "完成。日志查看："
echo "  docker compose logs -f --tail=100"
```

---

## 17. 完整流程总览（对照表）

| 步骤 | 做什么 | 成功标志 |
|------|--------|----------|
| 1 | 买海外 2C4G 服务器 | 拿到公网 IP |
| 2 | 放行 22/80/443 | SSH 能连 |
| 3 | `ssh ubuntu@IP` | 进入命令行 |
| 4 | 安装 Docker | `docker compose version` 有输出 |
| 5 | clone 代码到 `/opt/videograb` | 目录有 `docker-compose.yml` |
| 6 | 配置 `backend/.env` | 有 JWT / 可选 DeepSeek |
| 6b | （可选）上传 B站 Cookie | `secrets/cookies.txt` 存在且 600 |
| 7 | 确认 `docker-compose.prod.yml` + Dockerfile `BACKEND_URL` | 域名与代理正确 |
| 8 | `docker compose -f ... -f ...prod.yml up -d --build` | 两个容器 Up |
| 9 | 装 Caddy，反代 80→3000 | `http://IP` 可开 |
| 10 | 域名审核通过，加 `videograb` A 记录 | ping 到正确 IP |
| 11 | Caddy 配域名 HTTPS | `https://子域名` 有小锁 |
| 12 | 改 FRONTEND_URL / SITE_URL 并重建 | 正式域名稳定可用 |

---

## 18. 免责声明

本工具仅供个人学习与研究。请遵守各平台服务条款与当地法律法规。下载内容版权责任由用户自行承担。临时文件应按 TTL 清理，勿用于侵权或滥用。

---

**文档版本：** 基于 2026-07 一次新加坡轻量 + `videograb.codedance.work` 上线实践整理。  
若你的仓库路径、镜像名、compose 字段与本文略有差异，以仓库实际文件为准，但排错思路相同。
