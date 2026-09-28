FROM node:24.19.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/*/package.json apps/*/
COPY packages/*/package.json packages/*/
RUN npm ci
COPY . .
RUN npm run build

FROM node:24.19.0-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/*/package.json apps/*/
COPY packages/*/package.json packages/*/
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/typescript ./node_modules/typescript
EXPOSE 3001
CMD ["node", "dist/api/index.js"]
