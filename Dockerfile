FROM oven/bun:latest AS build-stage
WORKDIR /app

RUN bun config set registry https://registry.npmjs.org/

COPY package.json bun.lockb* yarn.lock* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5556
CMD ["nginx", "-g", "daemon off;"]