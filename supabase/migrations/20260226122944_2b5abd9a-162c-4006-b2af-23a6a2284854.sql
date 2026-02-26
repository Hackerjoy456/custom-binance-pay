-- Drop and recreate all RLS policies as PERMISSIVE

-- subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON subscriptions;

CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all subscriptions" ON subscriptions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- api_configurations
DROP POLICY IF EXISTS "Users can view own config" ON api_configurations;
DROP POLICY IF EXISTS "Users can insert own config" ON api_configurations;
DROP POLICY IF EXISTS "Users can update own config" ON api_configurations;
DROP POLICY IF EXISTS "Admins can view all configs" ON api_configurations;

CREATE POLICY "Users can view own config" ON api_configurations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own config" ON api_configurations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own config" ON api_configurations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all configs" ON api_configurations FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- api_keys
DROP POLICY IF EXISTS "Users can view own api keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert own api keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update own api keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can view all api keys" ON api_keys;

CREATE POLICY "Users can view own api keys" ON api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own api keys" ON api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own api keys" ON api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all api keys" ON api_keys FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- payment_verification_logs
DROP POLICY IF EXISTS "Users can view own logs" ON payment_verification_logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON payment_verification_logs;

CREATE POLICY "Users can view own logs" ON payment_verification_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all logs" ON payment_verification_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- used_transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON used_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON used_transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON used_transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON used_transactions;

CREATE POLICY "Users can view own transactions" ON used_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON used_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON used_transactions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all transactions" ON used_transactions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

CREATE POLICY "Users can view own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- pricing_plans
DROP POLICY IF EXISTS "Anyone can view active plans" ON pricing_plans;
DROP POLICY IF EXISTS "Admins can manage plans" ON pricing_plans;

CREATE POLICY "Anyone can view active plans" ON pricing_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage plans" ON pricing_plans FOR ALL USING (has_role(auth.uid(), 'admin'));

-- system_settings
DROP POLICY IF EXISTS "Anyone can view settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON system_settings;

CREATE POLICY "Anyone can view settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON system_settings FOR ALL USING (has_role(auth.uid(), 'admin'));