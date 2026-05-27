FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY backend/api-server/package*.json ./backend/api-server/
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/shared-utils/package*.json ./packages/shared-utils/

RUN npm ci --workspaces

COPY packages/ ./packages/
COPY backend/api-server/ ./backend/api-server/
COPY tsconfig.base.json ./

RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=packages/shared-utils
RUN npm run prisma:generate --workspace=backend/api-server
RUN npm run build:backend

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/backend/api-server/dist ./dist
COPY --from=builder /app/backend/api-server/prisma ./prisma
COPY --from=builder /app/backend/api-server/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
