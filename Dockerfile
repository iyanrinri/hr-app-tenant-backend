# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma.config.ts ./
COPY prisma ./prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client (with dummy DATABASE_URL for build time)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" pnpm prisma generate

# Build the application
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma.config.ts ./
COPY prisma ./prisma

# Install all dependencies (not just prod) because Prisma needs runtime dependencies
RUN pnpm install --frozen-lockfile

# Install tsx for running TypeScript migration scripts
RUN pnpm add tsx

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Generate Prisma Client (fresh in production with all correct deps)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" pnpm prisma generate

# Create uploads directory
RUN mkdir -p uploads/profiles

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
