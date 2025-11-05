# ---- Build stage ----
FROM node:18-alpine AS builder

WORKDIR /app
RUN apk add --no-cache python3 make g++

COPY package.json yarn.lock ./
COPY . .

# Install ALL deps (dev + prod)
RUN yarn install --frozen-lockfile

# Build TS -> JS
RUN yarn build


# ---- Runtime stage ----
FROM node:18-alpine AS runner

WORKDIR /app

# Copy only package files
COPY package.json yarn.lock ./

# Install only production deps
RUN yarn install --frozen-lockfile --production

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

EXPOSE 80

# Use start:prod (no nest cli needed)
CMD ["yarn", "start:prod"]
