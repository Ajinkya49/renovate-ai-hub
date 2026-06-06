
-- 1. Extend contractor_leads with unlock model
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS is_unlocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS credit_cost integer NOT NULL DEFAULT 0;

-- 2. Lead purchase ledger
CREATE TABLE IF NOT EXISTS public.lead_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('purchase','unlock','refund','grant')),
  credits_delta integer NOT NULL,
  balance_after integer NOT NULL,
  lead_id uuid REFERENCES public.contractor_leads(id) ON DELETE SET NULL,
  package_key text,
  amount_cents bigint,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lead_purchases TO authenticated;
GRANT ALL ON public.lead_purchases TO service_role;

ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_purchases owner read"
  ON public.lead_purchases FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = lead_purchases.contractor_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "lead_purchases admin all"
  ON public.lead_purchases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_lead_purchases_contractor
  ON public.lead_purchases (contractor_id, created_at DESC);

-- 3. Atomic unlock function
CREATE OR REPLACE FUNCTION public.unlock_lead_with_credits(_lead_id uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contractor_id uuid;
  v_cost integer;
  v_is_unlocked boolean;
  v_balance integer;
  v_new_balance integer;
BEGIN
  SELECT l.contractor_id, l.credit_cost, l.is_unlocked
    INTO v_contractor_id, v_cost, v_is_unlocked
    FROM public.contractor_leads l
    JOIN public.contractors c ON c.id = l.contractor_id
   WHERE l.id = _lead_id AND c.user_id = _user_id
   FOR UPDATE;

  IF v_contractor_id IS NULL THEN
    RAISE EXCEPTION 'Lead not found or not owned by user';
  END IF;

  IF v_is_unlocked THEN
    RETURN jsonb_build_object('ok', true, 'already_unlocked', true);
  END IF;

  SELECT balance INTO v_balance
    FROM public.lead_credits
   WHERE contractor_id = v_contractor_id
   FOR UPDATE;

  IF v_balance IS NULL THEN
    INSERT INTO public.lead_credits (contractor_id, balance) VALUES (v_contractor_id, 0)
    ON CONFLICT (contractor_id) DO NOTHING;
    v_balance := 0;
  END IF;

  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Insufficient credits: need %, have %', v_cost, v_balance;
  END IF;

  v_new_balance := v_balance - v_cost;

  UPDATE public.lead_credits
     SET balance = v_new_balance,
         lifetime_spent = lifetime_spent + v_cost
   WHERE contractor_id = v_contractor_id;

  UPDATE public.contractor_leads
     SET is_unlocked = true,
         unlocked_at = now(),
         status = CASE WHEN status = 'new' THEN 'viewed'::lead_status ELSE status END
   WHERE id = _lead_id;

  INSERT INTO public.lead_purchases (contractor_id, kind, credits_delta, balance_after, lead_id)
  VALUES (v_contractor_id, 'unlock', -v_cost, v_new_balance, _lead_id);

  INSERT INTO public.lead_events (lead_id, event_type, actor_id, metadata)
  VALUES (_lead_id, 'unlocked', _user_id, jsonb_build_object('credit_cost', v_cost));

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance, 'cost', v_cost);
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_lead_with_credits(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_lead_with_credits(uuid, uuid) TO service_role;

-- 4. Add credits function (stub purchases)
CREATE OR REPLACE FUNCTION public.add_lead_credits(
  _contractor_id uuid,
  _credits integer,
  _package_key text,
  _amount_cents bigint,
  _kind text DEFAULT 'purchase'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_new_balance integer;
BEGIN
  IF _credits <= 0 THEN
    RAISE EXCEPTION 'credits must be positive';
  END IF;

  INSERT INTO public.lead_credits (contractor_id, balance, lifetime_purchased)
  VALUES (_contractor_id, 0, 0)
  ON CONFLICT (contractor_id) DO NOTHING;

  SELECT balance INTO v_balance
    FROM public.lead_credits
   WHERE contractor_id = _contractor_id
   FOR UPDATE;

  v_new_balance := v_balance + _credits;

  UPDATE public.lead_credits
     SET balance = v_new_balance,
         lifetime_purchased = lifetime_purchased + _credits
   WHERE contractor_id = _contractor_id;

  INSERT INTO public.lead_purchases (contractor_id, kind, credits_delta, balance_after, package_key, amount_cents)
  VALUES (_contractor_id, _kind, _credits, v_new_balance, _package_key, _amount_cents);

  RETURN jsonb_build_object('ok', true, 'balance', v_new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.add_lead_credits(uuid, integer, text, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_lead_credits(uuid, integer, text, bigint, text) TO service_role;
