FROM oven/bun:1.1.38-alpine AS build
WORKDIR /app
COPY dashboard/package.json ./
RUN bun install
COPY dashboard/ ./
ARG VITE_API_BASE=http://127.0.0.1:8000
ENV VITE_API_BASE=$VITE_API_BASE
RUN bun run build

FROM oven/bun:1.1.38-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY dashboard/serve.ts ./serve.ts
EXPOSE 5173
CMD ["bun", "run", "serve.ts"]
