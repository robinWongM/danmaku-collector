FROM oven/bun:1

WORKDIR /app

# Copy dependency files first
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --production

# Copy source code after dependencies are installed
COPY src/ src/

CMD ["bun", "start"]
