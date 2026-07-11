-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "tax_in_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tax_rate_percent" INTEGER NOT NULL DEFAULT 0;
