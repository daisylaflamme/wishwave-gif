
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  credits_amount integer NOT NULL CHECK (credits_amount IN (1,3,6,10)),
  max_redemptions integer,
  redeemed_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.promo_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  credits_added integer NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, user_id)
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- No client access to promo_codes (only SECURITY DEFINER fn can read)
CREATE POLICY "No client select on promo_codes" ON public.promo_codes FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "No client insert on promo_codes" ON public.promo_codes FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No client update on promo_codes" ON public.promo_codes FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client delete on promo_codes" ON public.promo_codes FOR DELETE TO anon, authenticated USING (false);

-- Users can view their own redemptions; no client writes
CREATE POLICY "Users can view their own redemptions" ON public.promo_code_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "No client insert on redemptions" ON public.promo_code_redemptions FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No client update on redemptions" ON public.promo_code_redemptions FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client delete on redemptions" ON public.promo_code_redemptions FOR DELETE TO anon, authenticated USING (false);

CREATE INDEX idx_promo_redemptions_user ON public.promo_code_redemptions(user_id);

-- Atomic redemption function
CREATE OR REPLACE FUNCTION public.redeem_promo_code(_user_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_code public.promo_codes%rowtype;
  v_new_balance integer;
  v_norm_code text;
begin
  if auth.uid() is null or auth.uid() <> _user_id then
    raise exception 'Forbidden';
  end if;

  v_norm_code := upper(trim(_code));
  if v_norm_code is null or length(v_norm_code) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select * into v_code from public.promo_codes where code = v_norm_code for update;
  if not found or not v_code.is_active then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_code.expires_at is not null and v_code.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if v_code.max_redemptions is not null and v_code.redeemed_count >= v_code.max_redemptions then
    return jsonb_build_object('ok', false, 'error', 'fully_redeemed');
  end if;
  if v_code.credits_amount not in (1,3,6,10) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  begin
    insert into public.promo_code_redemptions (promo_code_id, user_id, credits_added)
    values (v_code.id, _user_id, v_code.credits_amount);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_used');
  end;

  update public.promo_codes set redeemed_count = redeemed_count + 1 where id = v_code.id;

  insert into public.user_credits (user_id, credits, lifetime_purchased)
  values (_user_id, v_code.credits_amount, v_code.credits_amount)
  on conflict (user_id) do update
    set credits = public.user_credits.credits + excluded.credits,
        lifetime_purchased = public.user_credits.lifetime_purchased + excluded.lifetime_purchased,
        updated_at = now()
  returning credits into v_new_balance;

  insert into public.purchases (
    user_id, price_id, package_name, credits_added, amount_cents, currency, status, environment
  ) values (
    _user_id,
    'promo_' || v_code.code,
    'Promo code credit — ' || v_code.code || ' — +' || v_code.credits_amount || ' credits',
    v_code.credits_amount,
    0,
    'usd',
    'completed',
    'promo'
  );

  return jsonb_build_object('ok', true, 'credits_added', v_code.credits_amount, 'new_balance', v_new_balance, 'code', v_code.code);
end;
$$;

REVOKE ALL ON FUNCTION public.redeem_promo_code(uuid, text) FROM anon, authenticated;

-- Seed codes
INSERT INTO public.promo_codes (code, credits_amount) VALUES
  ('FREE1', 1),
  ('FREE3', 3),
  ('FREE6', 6),
  ('FREE10', 10)
ON CONFLICT (code) DO NOTHING;
