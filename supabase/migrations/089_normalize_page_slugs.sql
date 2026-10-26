-- Migration 089: Normalize page slugs
-- Remove leading slashes from slugs and change "/" to "home"
-- This ensures the URL path matches the DB slug exactly

-- Fix the homepage slug: "/" → "home"
UPDATE pages SET slug = 'home' WHERE slug = '/';

-- Remove leading slashes from all other slugs: "/services" → "services"
UPDATE pages SET slug = LTRIM(slug, '/') WHERE slug LIKE '/%';
