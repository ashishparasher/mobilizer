# Base stage for caching npm dependencies
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Copy root monorepo files and package.json files for dependency installation
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies for both api and shared packages
RUN npm ci --workspace=@mobilize/api --workspace=@mobilize/shared

# Copy source code of the packages
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

# Build typescript code for API package
RUN npm run build --workspace=@mobilize/api

# Production Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built resources from base stage
COPY --from=base /app/package.json /app/package-lock.json ./
COPY --from=base /app/packages/api/package.json ./packages/api/
COPY --from=base /app/packages/shared/package.json ./packages/shared/
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/api/dist ./packages/api/dist
COPY --from=base /app/packages/shared/src ./packages/shared/src

EXPOSE 3001

# Run the compiled production output
CMD ["npm", "start", "--workspace=@mobilize/api"]
