ALTER TABLE public.food_requests
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS contact_number text,
  ADD COLUMN IF NOT EXISTS preferred_delivery_time timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS request_time timestamptz NOT NULL DEFAULT now();

UPDATE public.food_requests
SET
  delivery_address = COALESCE(delivery_address, ''),
  contact_number = COALESCE(contact_number, ''),
  notes = COALESCE(notes, message),
  request_time = COALESCE(request_time, created_at, now())
WHERE delivery_address IS NULL
   OR contact_number IS NULL
   OR notes IS NULL
   OR request_time IS NULL;

ALTER TABLE public.food_requests
  ALTER COLUMN delivery_address SET DEFAULT '',
  ALTER COLUMN delivery_address SET NOT NULL,
  ALTER COLUMN contact_number SET DEFAULT '',
  ALTER COLUMN contact_number SET NOT NULL,
  ALTER COLUMN request_time SET DEFAULT now(),
  ALTER COLUMN request_time SET NOT NULL;

DROP POLICY IF EXISTS "Requests visible to involved parties" ON public.food_requests;
DROP POLICY IF EXISTS "Beneficiaries create requests" ON public.food_requests;
DROP POLICY IF EXISTS "Update requests by involved parties" ON public.food_requests;
DROP POLICY IF EXISTS "Request participants update" ON public.food_requests;

CREATE POLICY "Requests visible to involved parties" ON public.food_requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = beneficiary_id
    OR private.has_role(auth.uid(), 'ngo')
    OR private.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.donations d
      WHERE d.id = food_requests.donation_id
        AND d.donor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.volunteer_tasks t
      WHERE t.request_id = food_requests.id
        AND t.volunteer_id = auth.uid()
    )
  );

CREATE POLICY "Beneficiaries create requests" ON public.food_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = beneficiary_id
    AND status = 'pending'
    AND (
      private.has_role(auth.uid(), 'beneficiary')
      OR private.has_role(auth.uid(), 'ngo')
      OR private.has_role(auth.uid(), 'admin')
      OR private.has_role(auth.uid(), 'volunteer')
    )
    AND EXISTS (
      SELECT 1
      FROM public.donations d
      WHERE d.id = food_requests.donation_id
        AND d.status = 'available'
    )
  );

CREATE POLICY "Request participants update" ON public.food_requests
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = beneficiary_id
    OR private.has_role(auth.uid(), 'ngo')
    OR private.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.donations d
      WHERE d.id = food_requests.donation_id
        AND d.donor_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = beneficiary_id
    OR private.has_role(auth.uid(), 'ngo')
    OR private.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.donations d
      WHERE d.id = food_requests.donation_id
        AND d.donor_id = auth.uid()
    )
  );