-- Revoke EXECUTE from PUBLIC, anon, and authenticated roles on SECURITY DEFINER functions.
-- These functions are intended to be invoked only by the service role from edge functions or triggers.

REVOKE ALL ON FUNCTION public.consume_credit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_credit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_credits_from_purchase(uuid, text, text, text, text, text, integer, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_credits() FROM PUBLIC, anon, authenticated;

-- Ensure service_role retains execute (default, but explicit for clarity).
GRANT EXECUTE ON FUNCTION public.consume_credit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_credits_from_purchase(uuid, text, text, text, text, text, integer, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_credits() TO service_role;