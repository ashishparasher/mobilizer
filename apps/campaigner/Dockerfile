# Base stage for dependencies
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
COPY apps/campaigner/package.json ./apps/campaigner/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --workspace=campaigner --workspace=@mobilize/shared

# Copy source
COPY packages/shared ./packages/shared
COPY apps/campaigner ./apps/campaigner

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=campaigner

# Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=base /app/package.json /app/package-lock.json ./
COPY --from=base /app/apps/campaigner/package.json ./apps/campaigner/
COPY --from=base /app/packages/shared/package.json ./packages/shared/
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/campaigner/.next ./apps/campaigner/.next
COPY --from=base /app/apps/campaigner/public ./apps/campaigner/public
COPY --from=base /app/packages/shared/src ./packages/shared/src

EXPOSE 3000
CMD ["npm", "start", "--workspace=campaigner"]
