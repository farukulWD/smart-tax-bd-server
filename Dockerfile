# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

RUN npm install -g pnpm

# Copy manifest + lockfile first to leverage Docker cache
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the app and build
COPY . .
RUN pnpm run build

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm

# Install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy the build output from the build stage
COPY --from=build /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 5000
CMD ["node", "dist/server.js"]