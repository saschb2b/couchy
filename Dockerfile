# syntax=docker/dockerfile:1.7
#
# Two-stage Node build for Couchy. The build stage runs `pnpm install`
# + `pnpm build` against the full source; the runtime stage carries
# only the production output, the Node entry, and the lockfile-pinned
# production dependencies.

# ---------- builder ----------
FROM node:24-bookworm-slim AS builder
WORKDIR /app

ENV CI=1 \
    PNPM_HOME=/root/.local/share/pnpm \
    PATH=/root/.local/share/pnpm:$PATH

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Trim node_modules to production-only for the runtime stage.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm prune --prod

# ---------- runtime ----------
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

# Run as the unprivileged `node` user that the official image ships.
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/server-entry.mjs ./server-entry.mjs
COPY --from=builder --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000

CMD ["node", "server-entry.mjs"]
