FROM node:20-alpine AS build-stage
WORKDIR /app

RUN yarn config set registry https://registry.npmjs.org/ -g && \
    yarn config set network-timeout 600000 -g

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile || (sleep 5 && yarn install --frozen-lockfile)

COPY . .
RUN yarn build

FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=build-stage /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5556

CMD ["nginx", "-g", "daemon off;"]