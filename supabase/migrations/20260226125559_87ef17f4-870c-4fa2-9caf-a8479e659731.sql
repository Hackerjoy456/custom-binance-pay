
-- Allow admin to delete from tables that currently don't allow it (needed for user deletion)
DO $$ BEGIN
  -- profiles: admin delete
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can delete profiles') THEN
    CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- api_configurations: admin delete
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_configurations' AND policyname = 'Admins can delete configs') THEN
    CREATE POLICY "Admins can delete configs" ON public.api_configurations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- payment_verification_logs: admin delete
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_verification_logs' AND policyname = 'Admins can delete logs') THEN
    CREATE POLICY "Admins can delete logs" ON public.payment_verification_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- api_keys: admin delete
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Admins can delete api keys') THEN
    CREATE POLICY "Admins can delete api keys" ON public.api_keys FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- subscriptions: admin delete
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'Admins can delete subscriptions') THEN
    CREATE POLICY "Admins can delete subscriptions" ON public.subscriptions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
