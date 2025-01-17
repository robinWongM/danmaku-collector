FROM oven/bun:1 as builder
WORKDIR /app

# Copy root package files
COPY package.json bun.lockb ./

# Copy all package.json files to maintain lockfile validity
COPY packages/receiver/package.json ./packages/receiver/
COPY packages/processor/package.json ./packages/processor/

RUN bun install --frozen-lockfile

COPY . .
RUN cd packages/receiver && bun run build

FROM oven/bun:1-slim
WORKDIR /app

COPY --from=builder /app/packages/receiver/dist ./dist
COPY --from=builder /app/packages/receiver/package.json ./

ENV NODE_ENV=production
CMD ["bun", "dist/index.js"] 