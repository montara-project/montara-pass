# Build context: repository root
#   docker build -f apps/app/Dockerfile -t montara-pass-app .

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/app/package.json apps/app/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @montara-pass/app
COPY apps/app apps/app
RUN pnpm --filter @montara-pass/app run build

# Standalone output bundles its own node_modules; no pnpm needed at runtime.
FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/app/dist/standalone ./
USER node
EXPOSE 3000
CMD ["node", "server.js"]
