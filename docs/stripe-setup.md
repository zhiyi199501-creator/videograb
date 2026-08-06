# Stripe 小白开通与本地测试指南

> 面向第一次用 Stripe 的开发者。目标：在**没有公网域名**的情况下，完成本地真实 Test Mode 支付闭环。

## 0. 先搞清两件事

1. **Test Mode（测试模式）**：假钱、测试卡，不会真扣款。开发阶段只用这个。  
2. **本地测 Webhook ≠ 断网**：你的电脑仍需能访问 Stripe（`api.stripe.com`）。  
   「没有公网」= 不需要把网站暴露到互联网；用 **Stripe CLI** 把事件转发到 `localhost` 即可。

---

## 1. 注册 Stripe 账号

1. 打开 [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register) 注册  
2. 登录后，页面左上角/右上角找到 **Test mode** 开关，**打开测试模式**  
3. 进入 [API keys](https://dashboard.stripe.com/test/apikeys)：
   - **Secret key**：`sk_test_…` → 只放后端 `.env`，永远不要提交到 Git、不要给前端  
   - Publishable key：`pk_test_…`（本期 Checkout 托管页可不使用）

> 若你的主体在中国大陆，开户/结算可能受限；测试模式通常仍可练手。货币（CNY/USD）以你账号实际支持为准；网站文案为 **¥9.9/月**，请在 Dashboard 创建对应价格并更新 `STRIPE_PRICE_PRO`。

---

## 2. 创建 Pro 商品与价格

1. 打开 [Products](https://dashboard.stripe.com/test/products) → **Add product**  
2. Name：`VideoGrab Pro`  
3. Pricing：
   - Recurring  
   - Price：`9.9`（若账号支持 CNY 选 `CNY`；否则先用等价测试价）  
   - Billing period：**Monthly**  
4. 保存后，点开价格，复制 **Price ID**（形如 `price_1ABC…`）  
   → 填入后端环境变量 `STRIPE_PRICE_PRO`

---

## 3. 安装 Stripe CLI（本机）

### macOS（Homebrew）

```bash
brew install stripe/stripe-cli/stripe
stripe version
```

### 登录 CLI（绑定你的 Test 账号）

```bash
stripe login
```

浏览器会弹出授权；成功后终端显示已就绪。

---

## 4. 配置本项目环境变量

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，至少填：

```bash
JWT_SECRET=请换成一长串随机字符
STRIPE_SECRET_KEY=sk_test_你的密钥
STRIPE_PRICE_PRO=price_你的Pro价格ID
FRONTEND_URL=http://localhost:3000
# 下一步 CLI listen 启动后会打印 whsec_...，再填这里：
STRIPE_WEBHOOK_SECRET=whsec_先留空等listen
```

---

## 5. 启动项目 + 转发 Webhook

**终端 1 — 前后端（推荐一键）**

```bash
# 在仓库根目录
./dev.sh
```

若需分开启动，见根目录 README「分开启动」：后端 `uvicorn …:8000`，前端 `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev`。

**终端 2 — Stripe CLI 转发（关键）**

```bash
stripe listen --forward-to localhost:8000/api/billing/webhook
```

你会看到类似：

```text
Ready! Your webhook signing secret is whsec_xxxxx
```

把 `whsec_xxxxx` 写入 `backend/.env` 的 `STRIPE_WEBHOOK_SECRET`，然后**重启后端**。

> 每次重新 `stripe listen`，若 secret 变了，需同步更新 `.env`。

---

## 6. 走一遍完整测试支付

> **注意（2026-08）**：前端已隐藏 `/pricing` 与「升级 Pro」。自助 Checkout 需临时调 `POST /api/billing/checkout`（带 JWT），或用 admin 人工开通 Pro。下列步骤保留供后端联调。

1. 打开 http://localhost:3000/register 注册账号并登录  
2. 用登录 JWT 调用 `POST /api/billing/checkout`，打开返回的 `url`（或临时恢复定价页）  
3. 跳到 Stripe Checkout，使用测试卡：

| 字段 | 值 |
|------|-----|
| 卡号 | `4242 4242 4242 4242` |
| 有效期 | 任意未来日期（如 `12/34`） |
| CVC | 任意三位数 |
| 邮编 | 任意（如 `10000`） |

4. 支付成功后 Stripe success URL 仍可能指向 `/pricing/success`（现会重定向首页）；以 webhook 履约为准  
5. 看 Stripe CLI 终端（终端 2）：应出现 `checkout.session.completed` 等事件且 HTTP 200  
6. 打开下载页：AI 总结全站免费（无需登录）；视频下载需登录，登录后每天免费 10 次；Pro 用户不扣次

### 常用失败场景测试卡

| 卡号 | 效果 |
|------|------|
| `4000000000000002` | 卡被拒绝 |
| `4000000000009995` | 余额不足 |

更多：[https://docs.stripe.com/testing](https://docs.stripe.com/testing)

---

## 7. 可选：用 CLI 触发事件（不经过收银台）

```bash
stripe trigger checkout.session.completed
```

注意：trigger 生成的是模拟对象，**不一定带你的 `user_id` metadata**，完整验收仍以真实 Checkout 流程为准。

---

## 8. 生产上线检查清单

当前线上 `videograb.codedance.work` 已接 **Test Mode** Webhook（`/api/billing/webhook`）。正式收款前再完成：

- [ ] 关闭 Test mode，使用 `sk_live_` / 正式 Price  
- [ ] Dashboard Webhooks 改为/新增 Live URL：`https://videograb.codedance.work/api/billing/webhook`  
- [ ] 勾选：`checkout.session.completed`、`customer.subscription.*`、`invoice.paid`、`invoice.payment_failed`  
- [ ] 使用 Dashboard 的 Live `whsec_`（勿把本机 `stripe listen` 的 whsec 当生产）  
- [ ] `JWT_SECRET` 强随机；HTTPS 全站强制  
- [ ] 成功/取消 URL 为正式前端域名  

**Q 补充（支付成功仍非 Pro）**：查后端 webhook 日志；履约失败时幂等记录应被删除并可重试。勿对 StripeObject 假设有 `.get()`（代码已 `_as_dict`）。

---

## 9. 常见问题

**Q: 支付成功了但还不是 Pro？**  
A: 多半是 Webhook 没到、验签失败，或履约异常后被幂等跳过。生产看 backend webhook 日志；本地确认 `stripe listen` 与 `STRIPE_WEBHOOK_SECRET` 一致。

**Q: 验签失败？**  
A: 必须用原始请求 body；不要用会改写 body 的中间件先解析 JSON。本项目 webhook 路由已按此实现。

**Q: 完全不能访问外网？**  
A: 无法调用 Stripe API，也就无法真实下单。只能写 mock；本期不采用。
