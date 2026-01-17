# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (both package.json and package-lock.json for reproducible builds)
COPY package.json package-lock.json ./

# Install dependencies using npm ci for deterministic, reproducible builds
# npm ci (clean install) respects the exact versions in package-lock.json
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

