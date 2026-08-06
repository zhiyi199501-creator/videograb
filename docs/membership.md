# 会员与下载额度

> 现役策略（2026-08-06）：登录后每天免费下载 **10** 次；AI 总结全站免费；**前端隐藏 Pro 自助注册/定价入口**（PC 与 iOS 一致）。后端仍保留 Stripe Checkout / Webhook / 人工 Pro（admin），便于日后重开或运营人工开通。

## 1. 产品范围（现役）

| 项 | 说明 |
|----|------|
| 登录 | 邮箱 + 密码，JWT，SQLite |
| 下载额度 | 未登录不能下载；登录用户每天 **10** 次（`DOWNLOAD_FREE_LIMIT=10`） |
| 重置 | `download_free_day`（`YYYY-MM-DD`）按 **Asia/Shanghai** 自然日；跨日将 `download_free_used` 清零 |
| AI | 总结 / 问答全站免费，不扣下载次 |
| Pro 自助 | **前端下线**：导航无定价；`/pricing*` 重定向首页；下载页无「升级 Pro」 |
| Pro 后端 | Stripe / `subscriptions` / admin 人工 grant 仍可用；已是 Pro 的用户仍无限下载 |

## 2. 下载权限流

```
未登录 → POST /api/jobs/{id}/download → 401
登录非 Pro → 校验当日 download_free_used < 10 → 成功则 +1
登录 Pro（active/past_due 且未过期）→ 不扣次
当日用尽 → 403（文案：请明天再试）
```

履约仍以 Webhook 为准（若将来重开 Checkout）。成功页仅作 UX。

## 3. 数据模型（SQLite users 相关）

| 字段 | 说明 |
|------|------|
| download_free_used | 当日已用次数 |
| download_free_day | 额度所属日（上海时区日期字符串）；与今天不同则重置 used |

其余 `subscriptions` / `stripe_events` / `checkout_sessions` 见历史 Stripe 设计；admin 人工 Pro：`POST /api/admin/users/{id}/pro`。

## 4. API（额度相关）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/me` | 含 `download_free_limit`（10）、`download_free_used`、`download_free_remaining`、`can_download`、`is_pro` |
| POST | `/api/jobs/{id}/download` | JWT；非 Pro 扣 1 次当日额度 |
| GET | `/api/jobs/{id}/file` | JWT；取文件不扣次 |
| POST | `/api/billing/checkout` 等 | 后端仍在；前端无入口 |

## 5. 前端隐藏点

- `Navbar`：无「定价」链接（PC / iOS WebView 相同站点）
- `/pricing`、`/pricing/success`、`/pricing/cancel` → 重定向 `/`
- 下载页额度用尽：提示明天再来，无升级链接
- 注册默认回跳：`/`（不再是 `/pricing`）
- sitemap 不再收录 `/pricing`

## 6. 环境变量（Stripe 保留）

见 `docs/stripe-setup.md`。自助入口关闭期间可不依赖用户走 Checkout；人工 Pro 与 webhook 履约逻辑仍有效。

## 7. 与旧决策的关系

2026-07 决策为「登录免费 3 次终身 + Pro ¥9.9/月」。2026-08-06 起以代码为准改为「每天 10 次 + 隐藏 Pro 入口」。旧 Stripe 文档仍描述如何配置，不代表前端现役转化路径。
