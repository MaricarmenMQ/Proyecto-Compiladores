FROM node:22-bookworm AS build

RUN apt-get update \
    && apt-get install -y --no-install-recommends cmake g++ make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --config Release

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /app /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV ALLOW_WEB_CONFIG=false

EXPOSE 3000
CMD ["node", "backend/server.js"]
