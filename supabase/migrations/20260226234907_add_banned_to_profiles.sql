ALTER TABLE public.profiles ADD COLUMN is_banned BOOLEAN DEFAULT false;

-- Admins can update is_banned column
CREATE POLICY "Admins can update is_banned" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
