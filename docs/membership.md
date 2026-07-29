# 会员购买与 Stripe 支付方案

> 已确认决策（2026-07）：登录（1A）+ 月付订阅（2A）+ 仅 Pro 套餐（3A，无 Team）+ CNY/Price 环境变量（4）+ AI 登录免费 3 次、Pro 无限（5B 演进）+ 本地 Stripe CLI 测试（6A）。

## 1. 产品范围（本期）

| 项 | 说明 |
|----|------|
| 登录 | 邮箱 + 密码，JWT，SQLite |
| 套餐 | 仅 **Pro**，¥9.9/月（Stripe Recurring Price，需在 Dashboard 创建对应价格） |
| 支付 | Stripe Checkout（托管收银台），`mode=subscription` |
| 权益 | 登录用户免费 AI 总结 **3 次**；Pro 无限；下载等其它功能仍可用 |
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

## 3. 数据模型（SQLite）

### users

| 字段 | 说明 |
|------|------|
| id | TEXT PK（uuid） |
| email | 唯一，小写 |
| password_hash | bcrypt |
| stripe_customer_id | 可空 |
| ai_free_used | INTEGER，非 Pro 已用免费 AI 次数（默认 0） |
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

### stripe_events

| 字段 | 说明 |
|------|------|
| event_id | PK（Stripe `evt_…`） |
| type | 事件类型 |
| processed_at | 处理时间 |

用于 Webhook **幂等**：同一 `event.id` 只处理一次。

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
| GET | `/api/auth/me` | JWT | 含 `is_pro`、订阅摘要 |
| POST | `/api/billing/checkout` | JWT | 返回 `{url}` |
| POST | `/api/billing/portal` | JWT | 返回 Customer Portal `{url}` |
| POST | `/api/billing/webhook` | Stripe 签名 | 原始 body 验签 |
| GET | `/api/jobs/{id}/summarize` | JWT + AI 额度 | 非 Pro 成功开始时扣 1 次免费额度；用尽 → 403 |
| POST | `/api/jobs/{id}/chat` | JWT + AI 额度 | 校验额度但不扣次；用尽 → 403 |

**AI 额度**：`can_use_ai` = Pro（`active`/`past_due` 且未过宽限期）**或** `ai_free_used < 3`。依赖 `require_ai_access` / `require_ai_access_and_consume`（旧名 `require_pro_user` 已改为走额度逻辑）。

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
| `STRIPE_PORTAL_CONFIG_ID` | 可选 |

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
- 下载页 AI 总结：有额度（含免费剩余次数）时可自动触发；无额度展示登录/升级引导并显示剩余次数

## 9. 本地测试（无公网域名）

见 [stripe-setup.md](stripe-setup.md)。使用 Stripe CLI：

```bash
stripe listen --forward-to localhost:8000/api/billing/webhook
```

电脑需能访问 `api.stripe.com`；无需公网 IP / ngrok。
