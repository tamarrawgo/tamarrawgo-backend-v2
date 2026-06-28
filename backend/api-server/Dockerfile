FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY packages/shared-types/ ./packages/shared-types/
COPY packages/shared-utils/ ./packages/shared-utils/
COPY backend/api-server/ ./backend/api-server/
COPY tsconfig.base.json ./

# Minimal root package.json with only backend-related workspaces
RUN echo '{"name":"tamarrawgo","private":true,"workspaces":["packages/*","backend/*"]}' > package.json

RUN npm install

RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=packages/shared-utils
RUN npm run prisma:generate --workspace=backend/api-server
RUN npm run build --workspace=backend/api-server

FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/api-server/dist ./backend/api-server/dist
COPY --from=builder /app/backend/api-server/prisma ./backend/api-server/prisma
COPY --from=builder /app/backend/api-server/package*.json ./backend/api-server/

WORKDIR /app/backend/api-server

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss || echo 'db push skipped'; node dist/main"]
