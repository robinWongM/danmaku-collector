FROM oven/bun:1 as builder
WORKDIR /app

COPY package.json bun.lockb ./
COPY packages/receiver/package.json ./packages/receiver/
RUN bun install --frozen-lockfile

COPY . .
RUN cd packages/receiver && bun run build

FROM oven/bun:1-slim
WORKDIR /app

COPY --from=builder /app/packages/receiver/dist ./dist
COPY --from=builder /app/packages/receiver/package.json ./

ENV NODE_ENV=production
CMD ["bun", "dist/index.js"] 