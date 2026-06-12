FROM node:24-alpine AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml  ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm run build

FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/.output /app/.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
