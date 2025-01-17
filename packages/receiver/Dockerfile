FROM oven/bun:1-slim
WORKDIR /app

# Copy root package files
COPY package.json bun.lockb ./

# Copy all package.json files to maintain lockfile validity
COPY packages/receiver/package.json ./packages/receiver/
COPY packages/processor/package.json ./packages/processor/

RUN bun install --frozen-lockfile

# Copy source files
COPY packages/receiver/src ./packages/receiver/src

ENV NODE_ENV=production
CMD ["bun", "run", "--cwd", "packages/receiver", "start"] 