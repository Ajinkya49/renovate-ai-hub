
-- =========================================================================
-- ENUMS
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.document_type AS ENUM ('license','insurance','w9','id','gallery','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_status AS ENUM ('pending','approved','rejected','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('pending','approved','rejected','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_plan AS ENUM ('free','starter','pro','enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('trialing','active','past_due','canceled','incomplete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending','succeeded','failed','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_purpose AS ENUM ('lead_purchase','subscription','credit_topup','refund');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- 1. CONTRACTOR_DOCUMENTS
-- =========================================================================
CREATE TABLE public.contractor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  doc_type public.document_type NOT NULL,
  status public.document_status NOT NULL DEFAULT 'pending',
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  file_name text,
  mime_type text,
  bytes bigint,
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_documents TO authenticated;
GRANT ALL ON public.contractor_documents TO service_role;
ALTER TABLE public.contractor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docs admin all" ON public.contractor_documents
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "docs owner read" ON public.contractor_documents
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_documents.contractor_id AND c.user_id = auth.uid())
  );
CREATE POLICY "docs owner insert" ON public.contractor_documents
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_documents.contractor_id AND c.user_id = auth.uid())
  );
CREATE POLICY "docs owner update" ON public.contractor_documents
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_documents.contractor_id AND c.user_id = auth.uid())
  );

CREATE INDEX idx_contractor_documents_contractor ON public.contractor_documents(contractor_id);
CREATE INDEX idx_contractor_documents_status ON public.contractor_documents(status);

CREATE TRIGGER trg_contractor_documents_updated_at
  BEFORE UPDATE ON public.contractor_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 2. CONTRACTOR_VERIFICATIONS
-- =========================================================================
CREATE TABLE public.contractor_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  status public.verification_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_verifications TO authenticated;
GRANT ALL ON public.contractor_verifications TO service_role;
ALTER TABLE public.contractor_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verifications admin all" ON public.contractor_verifications
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "verifications owner read" ON public.contractor_verifications
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_verifications.contractor_id AND c.user_id = auth.uid())
  );

CREATE INDEX idx_contractor_verifications_contractor ON public.contractor_verifications(contractor_id);
CREATE INDEX idx_contractor_verifications_status ON public.contractor_verifications(status);

CREATE TRIGGER trg_contractor_verifications_updated_at
  BEFORE UPDATE ON public.contractor_verifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 3. SUBSCRIPTIONS
-- =========================================================================
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contractor_id uuid,
  plan public.subscription_plan NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  provider text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions admin all" ON public.subscriptions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "subscriptions self read" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_contractor ON public.subscriptions(contractor_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 4. PAYMENTS
-- =========================================================================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contractor_id uuid,
  subscription_id uuid,
  lead_id uuid,
  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status public.payment_status NOT NULL DEFAULT 'pending',
  purpose public.payment_purpose NOT NULL,
  provider text,
  provider_payment_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments admin all" ON public.payments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "payments self read" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_contractor ON public.payments(contractor_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 5. LEAD_CREDITS
-- =========================================================================
CREATE TABLE public.lead_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  lifetime_purchased integer NOT NULL DEFAULT 0,
  lifetime_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lead_credits TO authenticated;
GRANT ALL ON public.lead_credits TO service_role;
ALTER TABLE public.lead_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credits admin all" ON public.lead_credits
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "credits owner read" ON public.lead_credits
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = lead_credits.contractor_id AND c.user_id = auth.uid())
  );

CREATE TRIGGER trg_lead_credits_updated_at
  BEFORE UPDATE ON public.lead_credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 6. ANALYTICS_EVENTS
-- =========================================================================
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_name text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.analytics_events TO authenticated, anon;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics anon insert" ON public.analytics_events
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "analytics self insert" ON public.analytics_events
  FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "analytics admin read" ON public.analytics_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_analytics_events_user ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- =========================================================================
-- 7. FEATURE_FLAGS
-- =========================================================================
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  rollout_percent integer NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO authenticated, anon;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flags public read" ON public.feature_flags
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "flags admin write" ON public.feature_flags
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- HARDENING: indexes on existing tables
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_zip ON public.projects(zip_code);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contractors_user ON public.contractors(user_id);
CREATE INDEX IF NOT EXISTS idx_contractors_slug ON public.contractors(slug);
CREATE INDEX IF NOT EXISTS idx_contractors_active ON public.contractors(is_active);
CREATE INDEX IF NOT EXISTS idx_contractor_leads_contractor ON public.contractor_leads(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_leads_project ON public.contractor_leads(project_id);
CREATE INDEX IF NOT EXISTS idx_contractor_leads_homeowner ON public.contractor_leads(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_contractor_leads_status ON public.contractor_leads(status);
CREATE INDEX IF NOT EXISTS idx_estimates_project ON public.estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimate_line_items_estimate ON public.estimate_line_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_contractor_reviews_contractor ON public.contractor_reviews(contractor_id);
CREATE INDEX IF NOT EXISTS idx_room_uploads_project ON public.room_uploads(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_project ON public.ai_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);

-- =========================================================================
-- REALTIME
-- =========================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contractor_leads;

-- =========================================================================
-- STORAGE POLICIES (private buckets — owner = first folder segment)
-- =========================================================================
-- contractor-licenses
CREATE POLICY "licenses owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contractor-licenses' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "licenses owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contractor-licenses' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "licenses owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contractor-licenses' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "licenses owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contractor-licenses' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "licenses admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contractor-licenses' AND public.has_role(auth.uid(),'admin'));

-- insurance-documents
CREATE POLICY "insurance owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'insurance-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "insurance owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'insurance-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "insurance owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'insurance-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "insurance owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'insurance-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "insurance admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'insurance-documents' AND public.has_role(auth.uid(),'admin'));

-- contractor-gallery
CREATE POLICY "gallery owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contractor-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "gallery owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contractor-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "gallery owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contractor-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "gallery owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contractor-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);

-- avatars
CREATE POLICY "avatars owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- reports
CREATE POLICY "reports owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "reports owner write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "reports admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reports' AND public.has_role(auth.uid(),'admin'));

-- Seed a baseline feature flag so the table isn't empty.
INSERT INTO public.feature_flags (key, enabled, description, rollout_percent)
VALUES
  ('lead_marketplace_v2', false, 'Enable v2 of the contractor lead marketplace', 0),
  ('ai_estimator_premium', true,  'Use the premium AI model for estimates', 100)
ON CONFLICT (key) DO NOTHING;
