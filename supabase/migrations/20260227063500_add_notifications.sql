-- Add notification fields to api_configurations
alter table public.api_configurations 
add column if not exists telegram_token text,
add column if not exists telegram_chat_id text,
add column if not exists discord_webhook_url text;
