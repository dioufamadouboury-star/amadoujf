# GROUPE YAMA+ Frontend Dockerfile
# Utilise Node 16 pour compatibilité avec react-scripts 5.0.1

FROM node:16-alpine as build

WORKDIR /app

# Build arguments
ARG REACT_APP_BACKEND_URL=https://groupeyamaplus.com
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV CI=false
ENV GENERATE_SOURCEMAP=false

# Copy package files
COPY package.json ./
COPY craco.config.js ./

# Install dependencies
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy source
COPY . .

# Build
RUN npm run build

# Production avec Nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
