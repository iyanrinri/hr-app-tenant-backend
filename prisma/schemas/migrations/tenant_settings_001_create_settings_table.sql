-- Create settings table for tenant database
CREATE TABLE IF NOT EXISTS "settings" (
  "id" BIGSERIAL PRIMARY KEY,
  "key" VARCHAR(255) NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "description" TEXT,
  "dataType" VARCHAR(20) NOT NULL DEFAULT 'STRING',
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX "idx_settings_category" ON "settings"("category");
CREATE INDEX "idx_settings_is_public" ON "settings"("isPublic");

-- Add comment
COMMENT ON TABLE "settings" IS 'Application settings with key-value pairs per tenant';