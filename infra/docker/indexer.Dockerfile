FROM node:24-slim AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml turbo.json ./
COPY apps/indexer/package.json apps/indexer/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/database/package.json packages/database/package.json
COPY .yarn .yarn
RUN yarn install --immutable
COPY . .
RUN yarn workspace @nft-marketplace/indexer build

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --create-home app
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/indexer/node_modules ./apps/indexer/node_modules
COPY --from=build --chown=app:app /workspace/apps/indexer ./indexer
COPY --from=build --chown=app:app /workspace/tooling/scripts/local-indexer-start.mjs ./local-indexer-start.mjs
USER app
EXPOSE 42069
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "process.exit(0)"
CMD ["node", "local-indexer-start.mjs"]
