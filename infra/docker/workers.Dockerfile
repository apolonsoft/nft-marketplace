FROM node:24-slim AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml turbo.json ./
# Immutable installs need every workspace represented in the shared lockfile.
COPY apps/api/package.json apps/api/package.json
COPY apps/indexer/package.json apps/indexer/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/workers/package.json apps/workers/package.json
COPY contracts/marketplace/package.json contracts/marketplace/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/observability/package.json packages/observability/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY .yarn .yarn
RUN yarn install --immutable
COPY . .
RUN yarn workspaces foreach --from @nft-marketplace/workers --recursive --topological run build

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --create-home app
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/workers/node_modules ./apps/workers/node_modules
COPY --from=build /workspace/packages ./packages
COPY --from=build --chown=app:app /workspace/apps/workers/dist ./dist
COPY --from=build --chown=app:app /workspace/apps/workers/package.json ./package.json
USER app
EXPOSE 3020
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3020/metrics').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
