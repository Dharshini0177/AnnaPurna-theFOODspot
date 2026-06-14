DROP POLICY IF EXISTS "Donors create donations" ON public.donations;
DROP POLICY IF EXISTS "Donors update own donations" ON public.donations;
DROP POLICY IF EXISTS "Requests visible to involved parties" ON public.food_requests;
DROP POLICY IF EXISTS "Update requests by involved parties" ON public.food_requests;
DROP POLICY IF EXISTS "Authors manage own articles" ON public.nutrition_articles;