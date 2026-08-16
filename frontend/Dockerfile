# ==========================================
# Build Stage
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy source files
COPY . .

# Build Vite application (outputs to /app/dist)
RUN npm run build

# ==========================================
# Run Stage (Nginx Web Server)
# ==========================================
FROM nginx:alpine

# Remove default Nginx site configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static frontend assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
