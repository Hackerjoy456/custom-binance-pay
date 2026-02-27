-- Add telegram_username for support contact on checkout page
ALTER TABLE public.api_configurations ADD COLUMN IF NOT EXISTS telegram_username TEXT;
