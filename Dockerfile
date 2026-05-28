FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy only the workspaces we need for the API
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared

# Install dependencies (ignoring the Next.js and Expo apps)
RUN npm install --workspace=@mobilize/api --workspace=@mobilize/shared --include-workspace-root

# Build the API (TypeScript)
RUN npm run build --workspace=@mobilize/api

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy built assets and modules from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api/package.json ./packages/api/package.json
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/shared ./packages/shared

# Railway injects the PORT env var automatically
EXPOSE 3001

# Start the Express API
CMD ["npm", "run", "start", "--workspace=@mobilize/api"]
