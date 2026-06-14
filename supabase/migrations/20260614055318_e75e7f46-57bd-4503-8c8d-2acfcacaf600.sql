
-- 1. Add delivery_address column
ALTER TABLE public.food_requests
  ADD COLUMN IF NOT EXISTS delivery_address text;

-- 2. Trigger: on request approval → reserve donation + create volunteer task
CREATE OR REPLACE FUNCTION public.on_request_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donation RECORD;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT id, pickup_location, status INTO v_donation
      FROM public.donations WHERE id = NEW.donation_id FOR UPDATE;

    -- reserve donation if still available
    IF v_donation.status = 'available' THEN
      UPDATE public.donations SET status = 'reserved' WHERE id = NEW.donation_id;
    END IF;

    -- create volunteer task if none exists for this request
    IF NOT EXISTS (SELECT 1 FROM public.volunteer_tasks WHERE request_id = NEW.id) THEN
      INSERT INTO public.volunteer_tasks (donation_id, request_id, pickup_location, drop_location, status)
      VALUES (NEW.donation_id, NEW.id, v_donation.pickup_location, NEW.delivery_address, 'open');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_approved ON public.food_requests;
CREATE TRIGGER trg_request_approved
  AFTER UPDATE ON public.food_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_request_approved();

-- 3. Trigger: on task status change → update donation + request status
CREATE OR REPLACE FUNCTION public.on_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'picked_up' THEN
      UPDATE public.donations SET status = 'in_transit' WHERE id = NEW.donation_id;
    ELSIF NEW.status = 'delivered' THEN
      UPDATE public.donations SET status = 'delivered' WHERE id = NEW.donation_id;
      IF NEW.request_id IS NOT NULL THEN
        UPDATE public.food_requests SET status = 'fulfilled' WHERE id = NEW.request_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_status_change ON public.volunteer_tasks;
CREATE TRIGGER trg_task_status_change
  AFTER UPDATE ON public.volunteer_tasks
  FOR EACH ROW EXECUTE FUNCTION public.on_task_status_change();
