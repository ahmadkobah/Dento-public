-- 082_add_vercel_project_id_to_domains.sql
-- Add vercel_project_id to domains table for Vercel API integration

ALTER TABLE public.domains
  ADD COLUMN IF NOT EXISTS vercel_project_id text;

COMMENT ON COLUMN public.domains.vercel_project_id IS 'Vercel project ID this domain is linked to (set by vercel-domain edge function)';
