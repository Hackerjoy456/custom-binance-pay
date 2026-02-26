-- Function to check if a user is banned by email (publicly accessible for login screen)
CREATE OR REPLACE FUNCTION public.check_is_banned(target_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_banned FROM public.profiles WHERE email = target_email LIMIT 1;
$$;

-- Grant access to anon and authenticated
GRANT EXECUTE ON FUNCTION public.check_is_banned(TEXT) TO anon, authenticated;
