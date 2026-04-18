FROM node:24-alpine AS deps
WORKDIR /app

COPY src/frontend/web/package.json ./
COPY src/frontend/web/package-lock.json* ./

RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY src/frontend/web ./

RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
