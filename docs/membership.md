# 会员购买与 Stripe 支付方案

> 已确认决策（2026-07）：登录（1A）+ 月付订阅（2A）+ 仅 Pro 套餐（3A，无 Team）+ CNY/Price 环境变量（4）+ 下载登录免费 3 次、Pro 无限 + AI 总结全站免费（5B 演进）+ 本地 Stripe CLI 测试（6A）。

## 1. 产品范围（本期）

| 项 | 说明 |
|----|------|
| 登录 | 邮箱 + 密码，JWT，SQLite |
| 套餐 | 仅 **Pro**，¥9.9/月（Stripe Recurring Price，需在 Dashboard 创建对应价格） |
| 支付 | Stripe Checkout（托管收银台），`mode=subscription` |
| 权益 | 未登录不能下载视频；登录免费下载 **3 次**；Pro 无限下载；AI 总结全站免费 |
| Team | 不做（定价页仅 Free / Pro） |
| 取消/改卡 | Customer Portal（可选入口） |

## 2. 业务流程

```
注册/登录
  → /pricing 点击「升级 Pro」
  → POST /api/billing/checkout（需 JWT）
  → 后端创建 Stripe Checkout Session（metadata.user_id + Idempotency-Key）
  → 浏览器跳转 session.url
  → 用户付款
  → Stripe Webhook → 后端幂等开通 Pro
  → 跳转 /pricing/success → 前端刷新 /api/auth/me
```

**履约以 Webhook 为准**，成功页仅作 UX；不可仅凭前端「支付成功」改会员状态。

下载权限：未登录只能解析与使用 AI 总结；`POST /api/jobs/{id}/download` 需登录，非 Pro 每次消耗 1 次免费下载额度。

## 3. 数据模型（SQLite）

### users

| 字段 | 说明 |
|------|------|
| id | TEXT PK（uuid） |
| email | 唯一，小写 |
| password_hash | bcrypt |
| stripe_customer_id | 可空 |
| download_free_used | INTEGER，非 Pro 已用免费下载次数（默认 0） |
| created_at | ISO 时间 |

### subscriptions

| 字段 | 说明 |
|------|------|
| user_id | PK / FK |
| plan | `pro` |
| status | `active` / `past_due` / `canceled` / `inactive` |
| stripe_subscription_id | 可空 |
| stripe_price_id | 可空 |
| current_period_end | Unix 秒，可空 |
| updated_at | ISO 时间 |

**Pro 有效判定**：`plan=pro` 且 `status in (active, past_due)` 且（无 period_end 或 `now < current_period_end + 宽限`）。  
本期简化：`status == active` 即视为 Pro（`past_due` 仍暂允访问，给续费缓冲）。

**人工 Pro（Admin）**：`POST /api/admin/users/{id}/pro`（需 `ADMIN_EMAILS`）可 `grant` / `revoke`，直接写 `subscriptions`（`grant` 时 `status=active` 且 `current_period_end=NULL`）。不经 Stripe；保留已有 `stripe_subscription_id`。若用户随后走 Checkout，webhook 仍会按 Stripe 状态同步。

### stripe_events

| 字段 | 说明 |
|------|------|
| event_id | PK（Stripe `evt_…`） |
| type | 事件类型 |
| processed_at | 处理时间 |

用于 Webhook **幂等**：同一 `event.id` 先占位；履约失败会删除该记录以便 Stripe 重试。处理前将 StripeObject 转为普通 dict（不可对 StripeObject 调 `.get()`）。

### checkout_sessions（可选履约去重）

| 字段 | 说明 |
|------|------|
| session_id | PK（`cs_…`） |
| user_id | |
| created_at | |

## 4. API

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 无 | `{email,password}` |
| POST | `/api/auth/login` | 无 | 返回 `{access_token, token_type, user}` |
| GET | `/api/auth/me` | JWT | 含 `is_pro`、`is_admin`、订阅摘要 |
| POST | `/api/billing/checkout` | JWT | 返回 `{url}` |
| POST | `/api/billing/portal` | JWT | 返回 Customer Portal `{url}` |
| POST | `/api/billing/webhook` | Stripe 签名 | 原始 body 验签 |
| POST | `/api/jobs/{id}/download` | JWT + 下载额度 | 非 Pro 成功开始时扣 1 次免费额度；用尽 → 403 |
| GET | `/api/jobs/{id}/file` | JWT | 取回已下载文件，不扣次 |
| GET | `/api/jobs/{id}/summarize` | 无 | 全站免费，不校验登录 |
| POST | `/api/jobs/{id}/chat` | 无 | 全站免费，不校验登录 |

**下载额度**：`can_download` = Pro（`active`/`past_due` 且未过宽限期）**或** `download_free_used < 3`。下载路由内校验并扣次。

## 5. 安全与幂等

1. Webhook 必须用 **原始 body** + `Stripe-Signature` + `STRIPE_WEBHOOK_SECRET` 验签  
2. `stripe_events.event_id` 唯一约束，重复事件直接 200 返回  
3. Checkout 创建使用 Idempotency-Key：`checkout:{user_id}:pro:{yyyy-mm-dd}`（同日重复点击复用意图）  
4. Session `client_reference_id` / `metadata.user_id` 绑定用户；履约只更新该用户  
5. `sk_` / `whsec_` 仅后端环境变量；前端不持有密钥  
6. 密码 bcrypt；JWT 短期（如 7 天）  

## 6. 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_PATH` | 默认 `backend/data/app.db` |
| `JWT_SECRET` | 必填（生产随机长串） |
| `JWT_EXPIRE_HOURS` | 默认 168 |
| `STRIPE_SECRET_KEY` | `sk_test_…` / `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `STRIPE_PRICE_PRO` | Pro 月付 Price ID（`price_…`） |
| `FRONTEND_URL` | 如 `http://localhost:3000`（success/cancel/portal 回跳） |

## 7. Webhook 事件

| 事件 | 动作 |
|------|------|
| `checkout.session.completed` | 绑定 customer，写入/激活 subscription |
| `customer.subscription.updated` | 同步 status / period_end |
| `customer.subscription.deleted` | status → canceled / inactive |
| `invoice.paid` | 确保 active + 更新 period_end |
| `invoice.payment_failed` | status → past_due |

## 8. 前端

- `/login`、`/register`
- Navbar 登录态 / 退出；Pro 角标
- `/pricing`：Free / Pro；已是 Pro 显示「当前方案」
- `/pricing/success`、`/pricing/cancel`
- 下载页 AI 总结：全站免费，解析后自动触发；未登录也可用
- 下载页视频下载：未登录展示登录引导；登录非 Pro 显示剩余下载次数，用尽后引导升级 Pro

## 9. 本地测试（无公网域名）

见 [stripe-setup.md](stripe-setup.md)。使用 Stripe CLI：

```bash
stripe listen --forward-to localhost:8000/api/billing/webhook
```

电脑需能访问 `api.stripe.com`；无需公网 IP / ngrok。
