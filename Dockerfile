FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

COPY tsconfig.json vite.config.ts ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 5001

CMD ["npm", "start"]
