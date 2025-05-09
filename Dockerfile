FROM oven/bun:latest

# 1. Copy install files
WORKDIR /app
COPY package.json bun.lockb ./

# 2. Install deps
RUN bun install

# 3. Copy source
COPY . .

# 4. Expose & launch
EXPOSE 3000
CMD ["bun", "src/index.ts"]
