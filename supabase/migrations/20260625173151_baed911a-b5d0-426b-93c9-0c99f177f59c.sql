
ALTER TABLE public.volunteer_tasks
  ADD COLUMN IF NOT EXISTS pickup_time timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_time timestamptz;

CREATE OR REPLACE FUNCTION public.on_task_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'picked_up' THEN
      IF NEW.pickup_time IS NULL THEN NEW.pickup_time := now(); END IF;
      UPDATE public.donations SET status = 'in_transit' WHERE id = NEW.donation_id;
    ELSIF NEW.status = 'delivered' THEN
      IF NEW.pickup_time IS NULL THEN NEW.pickup_time := COALESCE(OLD.pickup_time, now()); END IF;
      IF NEW.delivery_time IS NULL THEN NEW.delivery_time := now(); END IF;
      UPDATE public.donations SET status = 'delivered' WHERE id = NEW.donation_id;
      IF NEW.request_id IS NOT NULL THEN
        UPDATE public.food_requests SET status = 'fulfilled' WHERE id = NEW.request_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_task_status_change ON public.volunteer_tasks;
CREATE TRIGGER trg_on_task_status_change
  BEFORE UPDATE ON public.volunteer_tasks
  FOR EACH ROW EXECUTE FUNCTION public.on_task_status_change();

ALTER TABLE public.volunteer_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.donations REPLICA IDENTITY FULL;
ALTER TABLE public.food_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.volunteer_tasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.donations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.food_requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
