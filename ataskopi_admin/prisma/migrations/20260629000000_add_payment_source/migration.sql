-- AlterTable: Add payment_source column to inventory_purchases
ALTER TABLE "inventory_purchases" ADD COLUMN "payment_source" TEXT;
