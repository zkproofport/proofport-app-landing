# Dockerfile (dev)
# Development Dockerfile for ZKProofport landing page
# Runs Next.js dev server on port 3100 for docker-compose local dev

FROM node:20

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy Next.js config and source files
COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY content ./content
COPY src ./src

# Copy public assets
COPY public ./public

# Expose dev server port
EXPOSE 3100

# Start Next.js dev server
CMD ["npx", "next", "dev", "-p", "3100", "-H", "0.0.0.0"]
