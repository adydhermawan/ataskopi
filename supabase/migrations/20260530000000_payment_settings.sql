-- Migration: Add payment settings columns to order_mode_settings
ALTER TABLE public.order_mode_settings 
ADD COLUMN IF NOT EXISTS qris_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS cash_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS default_payment_method TEXT DEFAULT 'qris',
ADD COLUMN IF NOT EXISTS qris_qr_code_url TEXT;
