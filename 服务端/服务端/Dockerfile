FROM docker.1panel.live/library/node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV 端口=3000 \
    监听地址=0.0.0.0 \
    并发数=2

EXPOSE 3000

CMD ["node", "src/主.js"]