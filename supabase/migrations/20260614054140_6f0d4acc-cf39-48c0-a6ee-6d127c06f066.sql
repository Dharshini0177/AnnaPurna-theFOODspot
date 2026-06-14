
-- 1. Profiles: restrict SELECT to own row (admins can see all)
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- 2. user_roles: only admins can modify
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. volunteer_tasks: restrict SELECT
DROP POLICY IF EXISTS "Tasks visible to authenticated" ON public.volunteer_tasks;
DROP POLICY IF EXISTS "Volunteer tasks visible to authenticated" ON public.volunteer_tasks;
DROP POLICY IF EXISTS "Tasks viewable by authenticated" ON public.volunteer_tasks;
CREATE POLICY "Tasks visibility scoped" ON public.volunteer_tasks
  FOR SELECT TO authenticated
  USING (
    status = 'open'
    OR volunteer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ngo')
    OR EXISTS (SELECT 1 FROM public.donations d WHERE d.id = donation_id AND d.donor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.food_requests r WHERE r.id = request_id AND r.beneficiary_id = auth.uid())
  );

-- 4. Revoke EXECUTE on has_role from authenticated/anon (still callable within RLS as owner)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
