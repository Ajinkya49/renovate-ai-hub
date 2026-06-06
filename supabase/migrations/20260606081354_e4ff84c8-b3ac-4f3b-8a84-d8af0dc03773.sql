
REVOKE EXECUTE ON FUNCTION public.unlock_lead_with_credits(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_lead_credits(uuid, integer, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_lead_with_credits(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_lead_credits(uuid, integer, text, bigint, text) TO service_role;
