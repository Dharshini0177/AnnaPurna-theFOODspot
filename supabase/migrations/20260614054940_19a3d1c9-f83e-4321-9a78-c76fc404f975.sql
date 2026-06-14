CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert roles" ON public.user_roles;
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update roles" ON public.user_roles;
CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete roles" ON public.user_roles;
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Donors can create donations" ON public.donations;
CREATE POLICY "Donors can create donations" ON public.donations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = donor_id
    AND (
      private.has_role(auth.uid(), 'donor')
      OR private.has_role(auth.uid(), 'ngo')
      OR private.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "Donors manage own donations" ON public.donations;
CREATE POLICY "Donors manage own donations" ON public.donations
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = donor_id
    OR private.has_role(auth.uid(), 'ngo')
    OR private.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = donor_id
    OR private.has_role(auth.uid(), 'ngo')
    OR private.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Donors delete own donations" ON public.donations;
CREATE POLICY "Donors delete own donations" ON public.donations
  FOR DELETE TO authenticated
  USING (auth.uid() = donor_id OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Beneficiaries create requests" ON public.food_requests;
CREATE POLICY "Beneficiaries create requests" ON public.food_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = beneficiary_id
    AND (
      private.has_role(auth.uid(), 'beneficiary')
      OR private.has_role(auth.uid(), 'ngo')
      OR private.has_role(auth.uid(), 'admin')
      OR private.has_role(auth.uid(), 'volunteer')
    )
  );

DROP POLICY IF EXISTS "Request participants update" ON public.food_requests;
CREATE POLICY "Request participants update" ON public.food_requests
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = beneficiary_id
    OR private.has_role(auth.uid(), 'ngo')
    OR private.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.donations d
      WHERE d.id = food_requests.donation_id
        AND d.donor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "NGO/Admin create tasks" ON public.volunteer_tasks;
CREATE POLICY "NGO/Admin create tasks" ON public.volunteer_tasks
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'ngo') OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Tasks visibility scoped" ON public.volunteer_tasks;
CREATE POLICY "Tasks visibility scoped" ON public.volunteer_tasks
  FOR SELECT TO authenticated
  USING (
    status = 'open'
    OR volunteer_id = auth.uid()
    OR private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'ngo')
    OR EXISTS (
      SELECT 1 FROM public.donations d
      WHERE d.id = volunteer_tasks.donation_id
        AND d.donor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.food_requests r
      WHERE r.id = volunteer_tasks.request_id
        AND r.beneficiary_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Volunteers accept/update assigned tasks" ON public.volunteer_tasks;
CREATE POLICY "Volunteers accept/update assigned tasks" ON public.volunteer_tasks
  FOR UPDATE TO authenticated
  USING (
    (
      private.has_role(auth.uid(), 'volunteer')
      AND (volunteer_id IS NULL OR volunteer_id = auth.uid())
    )
    OR private.has_role(auth.uid(), 'ngo')
    OR private.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Authors/admin manage articles" ON public.nutrition_articles;
CREATE POLICY "Authors/admin manage articles" ON public.nutrition_articles
  FOR ALL TO authenticated
  USING (
    auth.uid() = author_id
    OR private.has_role(auth.uid(), 'ngo')
    OR private.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = author_id
    OR private.has_role(auth.uid(), 'ngo')
    OR private.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Users manage own chat" ON public.ai_chat_history;
CREATE POLICY "Users manage own chat" ON public.ai_chat_history
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;