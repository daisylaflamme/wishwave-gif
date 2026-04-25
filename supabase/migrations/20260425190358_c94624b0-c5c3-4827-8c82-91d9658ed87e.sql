CREATE OR REPLACE FUNCTION public.refund_credit(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  updated_count integer;
begin
  update public.user_credits
     set credits = credits + 1,
         lifetime_used = greatest(lifetime_used - 1, 0),
         updated_at = now()
   where user_id = _user_id;
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$function$;