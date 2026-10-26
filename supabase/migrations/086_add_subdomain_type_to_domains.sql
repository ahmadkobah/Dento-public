-- Migration 086: Add 'subdomain' to domains.domain_type constraint
-- Preview subdomains (e.g. slug.dento.app) provide instant website preview without DNS setup

ALTER TABLE domains DROP CONSTRAINT IF EXISTS domains_domain_type_check;
ALTER TABLE domains ADD CONSTRAINT domains_domain_type_check
  CHECK (domain_type = ANY (ARRAY['primary', 'custom', 'alias', 'subdomain']));
