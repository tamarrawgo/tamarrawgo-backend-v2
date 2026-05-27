FROM node:20-alpine AS builder

WORKDIR /app

COPY packages/shared-types/ ./packages/shared-types/
COPY packages/shared-utils/ ./packages/shared-utils/
COPY backend/api-server/ ./backend/api-server/
COPY tsconfig.base.json ./

RUN cd packages/shared-types && npm install && npm run build
RUN cd packages/shared-utils && npm install && npm run build
RUN cd backend/api-server && npm install && npx prisma generate && npm run build

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/backend/api-server/dist ./dist
COPY --from=builder /app/backend/api-server/prisma ./prisma
COPY --from=builder /app/backend/api-server/package*.json ./
COPY --from=builder /app/backend/api-server/node_modules ./node_modules

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
