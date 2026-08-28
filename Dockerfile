# Stage 1: Build
FROM node:22.23.2-alpine AS build
WORKDIR /app

# Pin pnpm so a new major (e.g. pnpm 11 strict dep builds) cannot break CI
RUN npm install -g pnpm@11.24.0

# Copy manifests first to leverage Docker cache.
# pnpm-workspace.yaml carries `allowBuilds` (approved dependency build scripts);
# without it pnpm >=11 fails with ERR_PNPM_IGNORED_BUILDS.
COPY package.json pnpm-workspace.yaml ./
RUN pnpm install

# Copy the rest of the app and build
COPY . .
RUN pnpm run build

# Stage 2: Run
FROM node:22.23.2-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm@11.24.0

# Install production dependencies only
COPY package.json pnpm-workspace.yaml ./
RUN pnpm install --prod

# Copy the build output from the build stage
COPY --from=build /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 5000
CMD ["node", "dist/server.js"]
