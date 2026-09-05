FROM node:24-slim

WORKDIR /workspace
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml turbo.json ./
COPY .yarn .yarn
COPY apps apps
COPY packages packages
COPY contracts contracts
RUN yarn install --immutable

RUN groupadd --system app && useradd --system --gid app --create-home app \
  && chown -R app:app /workspace
USER app

ENV NODE_ENV=development \
    CHOKIDAR_USEPOLLING=true \
    WATCHPACK_POLLING=true \
    TMPDIR=/tmp

CMD ["yarn", "dev"]
