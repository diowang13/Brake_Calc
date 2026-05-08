FROM node:20-alpine AS frontend-builder

ARG NPM_REGISTRY=https://registry.npmmirror.com

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm config set registry ${NPM_REGISTRY} && npm ci

COPY frontend ./
RUN npm run build

FROM nginx:1.27-alpine

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /frontend/dist /usr/share/nginx/html
