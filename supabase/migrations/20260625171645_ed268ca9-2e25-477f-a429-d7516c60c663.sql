DROP POLICY IF EXISTS "Requests visible to involved parties" ON public.food_requests;
CREATE POLICY "Requests visible to involved parties" ON public.food_requests
FOR SELECT TO authenticated
USING (
  auth.uid() = beneficiary_id
  OR private.has_role(auth.uid(), 'ngo'::app_role)
  OR private.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.donations d WHERE d.id = food_requests.donation_id AND d.donor_id = auth.uid())
);