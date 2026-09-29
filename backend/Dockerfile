FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --omit=dev && npm install tsx
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY db ./db
COPY scripts ./scripts

EXPOSE 4000

CMD ["sh", "-c", "npx tsx scripts/migrate.ts && node dist/server.js"]
