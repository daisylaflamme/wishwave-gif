
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
  -- Caller (edge function with service_role) is trusted to pass the verified user id.
  -- Function is REVOKE'd from anon/authenticated/PUBLIC.
  if _user_id is null then
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

REVOKE ALL ON FUNCTION public.redeem_promo_code(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(uuid, text) TO service_role;
