-- Set platform payment credentials
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('platform_binance_api_key', 'n03Ap0zov0YpSdhZeMCWdggPKMUwRolHKokL6nGrOLYHQIrAiHF7vqVdfWVdtH6d', 'Platform Binance API Key'),
  ('platform_binance_api_secret', 'zPd5rujgmjPtL0dwLqs0oQ2QktGbf25TyK6pSTFWrMIEqCSoY6b6dyEmYoYBrimJ', 'Platform Binance API Secret'),
  ('platform_binance_pay_id', '912227968', 'Platform Binance Pay Merchant ID'),
  ('platform_bep20_address', '0x96654d271abf6f9b842e906a425c33bec7dd29b5', 'Platform BEP20 Wallet Address')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Make hackf1283@gmail.com a super admin
-- Note: User must already exist in auth.users for this to work
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'hackf1283@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'User hackf1283@gmail.com (ID: %) is now an admin.', target_user_id;
  ELSE
    RAISE NOTICE 'User hackf1283@gmail.com not found in auth.users. Please sign up first.';
  END IF;
END $$;
