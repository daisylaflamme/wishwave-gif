
-- Add caller guard to consume_credit (defense in depth)
CREATE OR REPLACE FUNCTION public.consume_credit(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  updated_count integer;
begin
  -- Only allow service role or the user themselves to consume their own credit
  if auth.uid() is not null and auth.uid() <> _user_id then
    raise exception 'Forbidden';
  end if;

  update public.user_credits
     set credits = credits - 1,
         lifetime_used = lifetime_used + 1,
         updated_at = now()
   where user_id = _user_id
     and credits > 0;
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$function$;

-- Revoke client access to credit-granting function (service role only)
REVOKE EXECUTE ON FUNCTION public.add_credits_from_purchase(uuid, text, text, text, text, text, integer, integer, text, text) FROM PUBLIC, anon, authenticated;

-- Revoke client access to consume_credit too — should only be called from edge function
REVOKE EXECUTE ON FUNCTION public.consume_credit(uuid) FROM PUBLIC, anon, authenticated;
