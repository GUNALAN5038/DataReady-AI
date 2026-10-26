-- Revoke execute permissions from the handle_new_user trigger function
-- This prevents the Supabase Security Linter warning about anon/authenticated 
-- roles executing a SECURITY DEFINER function over the REST API.
-- Trigger functions should only be invoked by the database itself.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
