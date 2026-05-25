
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'contractor', 'homeowner');
CREATE TYPE public.project_status AS ENUM ('draft', 'analyzing', 'estimated', 'matched', 'closed', 'archived');
CREATE TYPE public.room_type AS ENUM ('kitchen', 'bathroom', 'living_room', 'bedroom', 'basement', 'whole_home', 'exterior', 'other');
CREATE TYPE public.lead_status AS ENUM ('new', 'viewed', 'contacted', 'quoted', 'won', 'lost', 'expired');
CREATE TYPE public.notification_channel AS ENUM ('in_app', 'email', 'sms');

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  region TEXT,
  zip_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'homeowner');
  RETURN NEW;
END; $$;

-- ============================================================
-- USER ROLES (separate table — prevents privilege escalation)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Trigger after user_roles exists
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  room_type room_type NOT NULL DEFAULT 'kitchen',
  status project_status NOT NULL DEFAULT 'draft',
  region TEXT,
  zip_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_projects_owner ON public.projects(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROOM UPLOADS
-- ============================================================
CREATE TABLE public.room_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  width INT,
  height INT,
  bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.room_uploads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_uploads_project ON public.room_uploads(project_id);

-- ============================================================
-- AI ANALYSIS
-- ============================================================
CREATE TABLE public.ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_objects JSONB NOT NULL DEFAULT '[]'::jsonb,
  complexity TEXT,
  confidence NUMERIC(4,3),
  tokens_used INT,
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_analysis_project ON public.ai_analysis(project_id);

-- ============================================================
-- ESTIMATES + LINE ITEMS
-- ============================================================
CREATE TABLE public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  low_cents BIGINT NOT NULL,
  expected_cents BIGINT NOT NULL,
  high_cents BIGINT NOT NULL,
  timeline_weeks_min INT,
  timeline_weeks_max INT,
  confidence NUMERIC(4,3),
  assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  region TEXT,
  pricing_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_estimates_project ON public.estimates(project_id);

CREATE TABLE public.estimate_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT,
  unit_cost_cents BIGINT NOT NULL,
  subtotal_cents BIGINT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.estimate_line_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_line_items_estimate ON public.estimate_line_items(estimate_id);

-- ============================================================
-- CONTRACTORS
-- ============================================================
CREATE TABLE public.contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  logo_url TEXT,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  service_zip_codes TEXT[] NOT NULL DEFAULT '{}',
  service_regions TEXT[] NOT NULL DEFAULT '{}',
  years_experience INT,
  license_number TEXT,
  insured BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  response_minutes_avg INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_contractors_active ON public.contractors(is_active);
CREATE INDEX idx_contractors_specialties ON public.contractors USING GIN(specialties);
CREATE INDEX idx_contractors_zips ON public.contractors USING GIN(service_zip_codes);
CREATE TRIGGER trg_contractors_updated BEFORE UPDATE ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.contractor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contractor_reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_reviews_contractor ON public.contractor_reviews(contractor_id);

-- Validate rating via trigger (not CHECK, per platform guidance)
CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_review_rating BEFORE INSERT OR UPDATE ON public.contractor_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE public.contractor_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  status lead_status NOT NULL DEFAULT 'new',
  score NUMERIC(4,3),
  price_cents BIGINT,
  homeowner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contractor_leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_leads_contractor ON public.contractor_leads(contractor_id, status);
CREATE INDEX idx_leads_homeowner ON public.contractor_leads(homeowner_id);
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.contractor_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.contractor_leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_lead_events_lead ON public.lead_events(lead_id, created_at DESC);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL DEFAULT 'in_app',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_actor ON public.audit_logs(actor_id, created_at DESC);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles admin all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles (read your own, only admins can write)
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "roles admin read all" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles admin write" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- projects
CREATE POLICY "projects owner all" ON public.projects FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "projects admin all" ON public.projects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- room_uploads
CREATE POLICY "uploads owner all" ON public.room_uploads FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "uploads admin read" ON public.room_uploads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ai_analysis
CREATE POLICY "analysis owner read" ON public.ai_analysis FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE POLICY "analysis admin all" ON public.ai_analysis FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- estimates
CREATE POLICY "estimates owner read" ON public.estimates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE POLICY "estimates admin all" ON public.estimates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "line items owner read" ON public.estimate_line_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.estimates e JOIN public.projects p ON p.id = e.project_id
    WHERE e.id = estimate_id AND p.owner_id = auth.uid()
  ));
CREATE POLICY "line items admin all" ON public.estimate_line_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contractors — public read of active profiles, owner update
CREATE POLICY "contractors public read" ON public.contractors FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "contractors owner update" ON public.contractors FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "contractors owner insert" ON public.contractors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contractors admin all" ON public.contractors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- reviews — public read, authenticated write
CREATE POLICY "reviews public read" ON public.contractor_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reviews self write" ON public.contractor_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "reviews self update" ON public.contractor_reviews FOR UPDATE TO authenticated USING (auth.uid() = reviewer_id);

-- leads — contractor sees theirs, homeowner sees theirs
CREATE POLICY "leads contractor read" ON public.contractor_leads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid()));
CREATE POLICY "leads contractor update" ON public.contractor_leads FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid()));
CREATE POLICY "leads homeowner read" ON public.contractor_leads FOR SELECT TO authenticated USING (auth.uid() = homeowner_id);
CREATE POLICY "leads admin all" ON public.contractor_leads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "lead events read via lead" ON public.lead_events FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.contractor_leads l
    LEFT JOIN public.contractors c ON c.id = l.contractor_id
    WHERE l.id = lead_id AND (l.homeowner_id = auth.uid() OR c.user_id = auth.uid())
  )
);
CREATE POLICY "lead events admin all" ON public.lead_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- notifications
CREATE POLICY "notifications self read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications self update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- audit_logs — admin read only
CREATE POLICY "audit admin read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- STORAGE BUCKET for room uploads
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('room-uploads', 'room-uploads', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "room uploads owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'room-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "room uploads owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'room-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "room uploads owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'room-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
