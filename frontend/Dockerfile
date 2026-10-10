FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production
# The application uses environment.apiUrl for the backup flow and therefore
# does not need post-build URL rewriting. Legacy feature services still have
# their own migration pending; keep their existing fallback isolated from this
# backup fix rather than changing unrelated features in this deployment.
RUN find /app/dist/frontend/browser -type f -name '*.js' -exec sed -i 's|http://localhost:8080||g' {} +

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
