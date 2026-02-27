-- Enable realtime for payment_verification_logs
alter publication supabase_realtime add table public.payment_verification_logs;
