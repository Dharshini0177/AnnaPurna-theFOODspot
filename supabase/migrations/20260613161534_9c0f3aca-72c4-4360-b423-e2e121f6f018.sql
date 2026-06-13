
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('donor', 'beneficiary', 'volunteer', 'ngo', 'admin');
CREATE TYPE public.donation_status AS ENUM ('available', 'reserved', 'in_transit', 'delivered', 'expired', 'cancelled');
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled');
CREATE TYPE public.task_status AS ENUM ('open', 'accepted', 'picked_up', 'delivered', 'cancelled');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ AUTO PROFILE + DEFAULT ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  default_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address'
  );

  BEGIN
    default_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'beneficiary'::public.app_role);
  EXCEPTION WHEN others THEN
    default_role := 'beneficiary'::public.app_role;
  END;

  -- Prevent self-assigning admin via metadata
  IF default_role = 'admin' THEN
    default_role := 'beneficiary';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, default_role);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ TIMESTAMP HELPER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ DONATIONS ============
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  food_type TEXT NOT NULL,
  quantity TEXT NOT NULL,
  servings INT,
  expiry_time TIMESTAMPTZ NOT NULL,
  pickup_location TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  status public.donation_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donations visible to authenticated" ON public.donations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Donors create donations" ON public.donations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = donor_id AND (public.has_role(auth.uid(), 'donor') OR public.has_role(auth.uid(), 'ngo') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Donors update own donations" ON public.donations FOR UPDATE TO authenticated
  USING (auth.uid() = donor_id OR public.has_role(auth.uid(), 'ngo') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = donor_id OR public.has_role(auth.uid(), 'ngo') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Donors delete own donations" ON public.donations FOR DELETE TO authenticated
  USING (auth.uid() = donor_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_donations_updated BEFORE UPDATE ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FOOD REQUESTS ============
CREATE TABLE public.food_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  beneficiary_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  servings_requested INT NOT NULL DEFAULT 1,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_requests TO authenticated;
GRANT ALL ON public.food_requests TO service_role;
ALTER TABLE public.food_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requests visible to involved parties" ON public.food_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = beneficiary_id
    OR EXISTS (SELECT 1 FROM public.donations d WHERE d.id = donation_id AND d.donor_id = auth.uid())
    OR public.has_role(auth.uid(), 'ngo')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'volunteer')
  );
CREATE POLICY "Beneficiaries create requests" ON public.food_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = beneficiary_id);
CREATE POLICY "Update requests by involved parties" ON public.food_requests FOR UPDATE TO authenticated
  USING (
    auth.uid() = beneficiary_id
    OR EXISTS (SELECT 1 FROM public.donations d WHERE d.id = donation_id AND d.donor_id = auth.uid())
    OR public.has_role(auth.uid(), 'ngo')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON public.food_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ VOLUNTEER TASKS ============
CREATE TABLE public.volunteer_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.food_requests(id) ON DELETE SET NULL,
  volunteer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pickup_location TEXT NOT NULL,
  drop_location TEXT,
  notes TEXT,
  status public.task_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_tasks TO authenticated;
GRANT ALL ON public.volunteer_tasks TO service_role;
ALTER TABLE public.volunteer_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks viewable by authenticated" ON public.volunteer_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "NGO/Admin create tasks" ON public.volunteer_tasks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ngo') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Volunteers accept/update assigned tasks" ON public.volunteer_tasks FOR UPDATE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'volunteer') AND (volunteer_id IS NULL OR volunteer_id = auth.uid()))
    OR public.has_role(auth.uid(), 'ngo')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.volunteer_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ NUTRITION ARTICLES ============
CREATE TABLE public.nutrition_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_articles TO authenticated;
GRANT SELECT ON public.nutrition_articles TO anon;
GRANT ALL ON public.nutrition_articles TO service_role;
ALTER TABLE public.nutrition_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published articles public" ON public.nutrition_articles FOR SELECT USING (published = true);
CREATE POLICY "Authors manage own articles" ON public.nutrition_articles FOR ALL TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'ngo') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(), 'ngo') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON public.nutrition_articles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AI CHAT HISTORY ============
CREATE TABLE public.ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ai_chat_history TO authenticated;
GRANT ALL ON public.ai_chat_history TO service_role;
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own chat" ON public.ai_chat_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own chat" ON public.ai_chat_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own chat" ON public.ai_chat_history FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ INDEXES ============
CREATE INDEX idx_donations_status ON public.donations(status);
CREATE INDEX idx_donations_donor ON public.donations(donor_id);
CREATE INDEX idx_requests_beneficiary ON public.food_requests(beneficiary_id);
CREATE INDEX idx_requests_donation ON public.food_requests(donation_id);
CREATE INDEX idx_tasks_volunteer ON public.volunteer_tasks(volunteer_id);
CREATE INDEX idx_tasks_status ON public.volunteer_tasks(status);
CREATE INDEX idx_articles_category ON public.nutrition_articles(category);
CREATE INDEX idx_chat_user ON public.ai_chat_history(user_id, created_at);
