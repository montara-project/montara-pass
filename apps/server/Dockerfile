# syntax=docker/dockerfile:1

# Single-image deployment: the web app (apps/app) is compiled with pnpm, then
# placed next to the Go binary, so one process on port 8080 serves both the
# API under /v1 and the UI.
#
# Build context: repository root
#   docker build -f apps/server/Dockerfile -t montara-pass-server .

# --- Stage 1: build the web app --------------------------------------------
FROM node:24-alpine AS web
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

# Manifests first, so the install layer is cached independently of the source.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/app/package.json apps/app/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @montara-pass/app

COPY apps/app apps/app

# Vite inlines VITE_* into the bundle at build time. An empty VITE_API_URL
# means "the page's own origin", which is what this image wants: UI and API
# share one. Pass --build-arg VITE_API_URL=... only for an API elsewhere.
ARG VITE_APP_NAME="Montara Pass"
ARG VITE_API_URL=""
ENV VITE_APP_NAME=$VITE_APP_NAME VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @montara-pass/app run build

# --- Stage 2: build the API -------------------------------------------------
FROM golang:1.27-alpine AS api
WORKDIR /src
COPY apps/server/go.mod apps/server/go.sum ./
RUN --mount=type=cache,id=go-mod,target=/go/pkg/mod go mod download
COPY apps/server ./
RUN --mount=type=cache,id=go-mod,target=/go/pkg/mod \
    --mount=type=cache,id=go-build,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate

# --- Stage 3: runtime -------------------------------------------------------
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=api /out/api /out/migrate /usr/local/bin/
# The API serves the web app from ./public, relative to this directory.
WORKDIR /app
COPY --from=web /repo/apps/app/dist ./public
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/api"]
