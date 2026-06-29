-- Migration: Redesign daily_real_revenue from single amount to multi-method breakdown
-- This converts the "Omset Real" feature into "Catatan Kas Harian" (Daily Cash Reconciliation)

-- Step 1: Rename old 'amount' column to 'cash_amount' (data lama diasumsikan semua cash)
ALTER TABLE daily_real_revenue RENAME COLUMN amount TO cash_amount;

-- Step 2: Add new breakdown columns
ALTER TABLE daily_real_revenue
  ADD COLUMN qris_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN other_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN other_method_name TEXT,
  ADD COLUMN total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN gross_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN cash_purchases DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN web_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN is_closed BOOLEAN NOT NULL DEFAULT false;

-- Step 3: Migrate existing data — set total_amount = cash_amount, gross_revenue = cash_amount
UPDATE daily_real_revenue
SET total_amount = cash_amount,
    gross_revenue = cash_amount;
