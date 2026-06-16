DROP POLICY IF EXISTS "Users add own non-admin roles" ON public.user_roles;

CREATE POLICY "Users add own non-admin roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('donor', 'beneficiary', 'volunteer', 'ngo')
  );