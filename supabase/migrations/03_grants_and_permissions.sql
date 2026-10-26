
-- Migration: 03_grants_and_permissions.sql
-- DataReady AI: targeted table permissions
-- Review before running against the intended Supabase project.

BEGIN;

-- 1. Schema access
GRANT USAGE ON SCHEMA public
TO anon, authenticated, service_role;

-- 2. Revoke existing privileges only on the nine application tables

REVOKE ALL PRIVILEGES ON TABLE public.profiles
FROM anon, authenticated, PUBLIC;

REVOKE ALL PRIVILEGES ON TABLE public.datasets
FROM anon, authenticated, PUBLIC;

REVOKE ALL PRIVILEGES ON TABLE public.analyses
FROM anon, authenticated, PUBLIC;

REVOKE ALL PRIVILEGES ON TABLE public.dataset_transformations
FROM anon, authenticated, PUBLIC;

REVOKE ALL PRIVILEGES ON TABLE public.chat_conversations
FROM anon, authenticated, PUBLIC;

REVOKE ALL PRIVILEGES ON TABLE public.chat_messages
FROM anon, authenticated, PUBLIC;

REVOKE ALL PRIVILEGES ON TABLE public.api_provider_keys
FROM anon, authenticated, PUBLIC;

REVOKE ALL PRIVILEGES ON TABLE public.notifications
FROM anon, authenticated, PUBLIC;

REVOKE ALL PRIVILEGES ON TABLE public.security_events
FROM anon, authenticated, PUBLIC;

-- 3. Grant authenticated users only the intended table operations

GRANT SELECT, INSERT, UPDATE
ON TABLE public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.datasets TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.analyses TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.dataset_transformations TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.chat_conversations TO authenticated;

GRANT SELECT, INSERT, DELETE
ON TABLE public.chat_messages TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.api_provider_keys TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.notifications TO authenticated;

GRANT SELECT, INSERT
ON TABLE public.security_events TO authenticated;

-- 4. Grant service_role the required CRUD permissions
-- Existing service_role permissions are otherwise left unchanged.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.profiles,
    public.datasets,
    public.analyses,
    public.dataset_transformations,
    public.chat_conversations,
    public.chat_messages,
    public.api_provider_keys,
    public.notifications,
    public.security_events
TO service_role;

-- 5. Ensure the datasets bucket is private.
-- Existing Storage policies are preserved.

UPDATE storage.buckets
SET public = false
WHERE id = 'datasets';

COMMIT;
