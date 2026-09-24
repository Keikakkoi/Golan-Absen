FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production
# Production requests must use the same-origin Nginx proxy instead of the
# developer-only localhost backend URL embedded in legacy feature services.
RUN find /app/dist/frontend/browser -type f -name '*.js' -exec sed -i 's|http://localhost:8080||g' {} +

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
