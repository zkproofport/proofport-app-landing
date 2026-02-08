# Dockerfile (dev)
# Development Dockerfile for ZKProofPort landing page
# Multi-stage: extracts amd64 bb + libs, runs Node.js natively (arm64/amd64)
# Runs Next.js dev server on port 3100 for docker-compose local dev

# Stage 1: Extract bb binary + x86_64 runtime libs (amd64)
FROM --platform=linux/amd64 ubuntu:24.04 AS bb-deps
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN curl -L "https://github.com/AztecProtocol/aztec-packages/releases/download/v1.0.0-nightly.20250723/barretenberg-amd64-linux.tar.gz" \
    -o /tmp/bb.tar.gz \
    && tar -xzf /tmp/bb.tar.gz -C /usr/local/bin \
    && rm /tmp/bb.tar.gz \
    && chmod +x /usr/local/bin/bb
RUN bb --version
RUN mkdir /bb-deps && cp /usr/local/bin/bb /bb-deps/ \
    && cp /lib64/ld-linux-x86-64.so.2 /bb-deps/ \
    && ldd /usr/local/bin/bb | grep "=> /" | awk '{print $3}' | while read lib; do cp "$lib" /bb-deps/ 2>/dev/null || true; done

# Stage 2: Native runtime (arm64 on ARM Mac, amd64 on x86)
FROM ubuntu:24.04

WORKDIR /app

# Install system dependencies + Node.js 20
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg jq \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install nargo (Noir compiler) — locked version 1.0.0-beta.8 (native arch)
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "arm64" ]; then NARGO_ARCH="aarch64"; else NARGO_ARCH="x86_64"; fi && \
    curl -L "https://github.com/noir-lang/noir/releases/download/v1.0.0-beta.8/nargo-${NARGO_ARCH}-unknown-linux-gnu.tar.gz" \
    -o /tmp/nargo.tar.gz \
    && tar -xzf /tmp/nargo.tar.gz -C /usr/local/bin \
    && rm /tmp/nargo.tar.gz \
    && chmod +x /usr/local/bin/nargo

# Install bb (amd64) + x86_64 runtime libraries for cross-arch execution
COPY --from=bb-deps /bb-deps/bb /usr/local/bin/bb
COPY --from=bb-deps /bb-deps/ld-linux-x86-64.so.2 /lib64/ld-linux-x86-64.so.2
RUN mkdir -p /usr/lib/x86_64-linux-gnu
COPY --from=bb-deps /bb-deps/lib*.so* /usr/lib/x86_64-linux-gnu/

# Create shared bb cache directory (SRS downloads cached here, not per-session)
RUN mkdir -p /tmp/bb-cache

# Verify nargo
RUN nargo --version

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
