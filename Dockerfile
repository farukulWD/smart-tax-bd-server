# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Copy manifest + lockfile first to leverage Docker cache
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the app and build
COPY . .
RUN npm run build

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the build output from the build stage
COPY --from=build /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 5000
CMD ["node", "dist/server.js"]
