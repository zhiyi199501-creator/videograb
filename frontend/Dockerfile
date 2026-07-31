FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
# 使用国内镜像源，避免默认 registry 大文件下载被重置
RUN npm config set registry https://registry.npmmirror.com && npm install --no-audit --no-fund
COPY . .

# 默认留空：浏览器走同源 /api。需要直连后端时再在 compose 里传入。
ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_SITE_URL=https://videograb.lianxi.com
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Next.js rewrites 在 build 时读取 BACKEND_URL；Docker Compose 内应为 http://backend:8000
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=$BACKEND_URL

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
