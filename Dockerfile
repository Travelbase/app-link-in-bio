# syntax=docker/dockerfile:1.7
# Production image on Cloud Run, behind apps.travelbase.eu/a/link-in-bio/. One image, two uses:
# the service link-in-bio (SPA + API, server/server.ts) and the job link-in-bio-daily
# (server/jobs/daily.ts). Nothing here is used by Lovable or `npm run dev`.
#
# @travelbase/app-api-kit comes from GitHub Packages: the token is a BuildKit secret
# (--secret id=npm_token,src=<file>) so it never lands in a layer. The deploy workflow passes it.

# ---- build the SPA against the production backend ----
FROM oven/bun:1-alpine AS spa
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
ARG IMAGE_BUCKET=travelbase-link-in-bio-images
# VITE_APP_BASE puts the app under /a/link-in-bio/ and its assets under /a/link-in-bio/public/
# (vite.config.ts); VITE_DATA_BACKEND=http swaps Supabase for the API in server/.
ENV VITE_APP_BASE=/a/link-in-bio/ \
    VITE_DATA_BACKEND=http \
    VITE_IMAGE_BASE_URL=https://storage.googleapis.com/${IMAGE_BUCKET}
RUN bun run build && cp dist/a/link-in-bio/public/index.html dist/a/link-in-bio/index.html

# ---- run ----
FROM oven/bun:1-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY server/package.json server/.npmrc ./
RUN --mount=type=secret,id=npm_token \
    GITHUB_TOKEN="$(cat /run/secrets/npm_token)" bun install --production
COPY server/ ./
COPY --from=spa /app/dist ./dist
EXPOSE 8080
CMD ["bun", "run", "server.ts"]
