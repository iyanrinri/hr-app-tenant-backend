-- Fix Role enum - update to include SUPER and HR roles
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE 'SUPER' BEFORE 'ADMIN';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE 'HR';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable for employees (in master database)
CREATE TABLE IF NOT EXISTS "employees" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "joinDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "employees_userId_unique" ON "employees"("userId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
