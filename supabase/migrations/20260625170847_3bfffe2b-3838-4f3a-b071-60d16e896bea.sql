
-- Fix: aggregate across all rows regardless of caller RLS by running as definer.
CREATE OR REPLACE FUNCTION public.get_platform_analytics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT jsonb_build_object(
    'totalDonations', (SELECT count(*) FROM public.donations),
    'availableDonations', (SELECT count(*) FROM public.donations WHERE status = 'available'),
    'deliveredDonations', (SELECT count(*) FROM public.donations WHERE status = 'delivered'),
    'totalRequests', (SELECT count(*) FROM public.food_requests),
    'approvedRequests', (SELECT count(*) FROM public.food_requests WHERE status IN ('approved', 'fulfilled')),
    'totalTasks', (SELECT count(*) FROM public.volunteer_tasks),
    'openTasks', (SELECT count(*) FROM public.volunteer_tasks WHERE status = 'open'),
    'totalUsers', (SELECT count(*) FROM public.profiles),
    'volunteers', (SELECT count(*) FROM public.user_roles WHERE role = 'volunteer'),
    'ngos', (SELECT count(*) FROM public.user_roles WHERE role = 'ngo'),
    'totalServingsSaved', COALESCE((SELECT sum(COALESCE(servings, 1)) FROM public.donations WHERE status = 'delivered'), 0),
    'weeklyTrend', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', day_label, 'donations', donations, 'requests', requests) ORDER BY day_date)
      FROM (
        SELECT
          day_date,
          to_char(day_date, 'Dy') AS day_label,
          (SELECT count(*) FROM public.donations d WHERE d.created_at::date = day_date) AS donations,
          (SELECT count(*) FROM public.food_requests r WHERE r.created_at::date = day_date) AS requests
        FROM generate_series((current_date - interval '6 days')::date, current_date, interval '1 day') AS day_date
      ) days
    ), '[]'::jsonb)
  );
$function$;

REVOKE ALL ON FUNCTION public.get_platform_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_analytics() TO authenticated;

-- Security fix: prevent users from self-assigning the 'ngo' role.
DROP POLICY IF EXISTS "Users add own non-admin roles" ON public.user_roles;
CREATE POLICY "Users add own non-admin roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('donor'::public.app_role, 'beneficiary'::public.app_role, 'volunteer'::public.app_role)
);
