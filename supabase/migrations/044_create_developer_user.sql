-- Update Ahmad to Developer Role
-- Run this in your Supabase SQL Editor

-- Update existing user to developer role
INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
VALUES (
  '379ffaaa-e40a-4f51-9ea3-8a3946ff4f74',
  'user1@example.com',
  'Ahmadkobah',
  'developer',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET 
  role = 'developer',
  updated_at = NOW();

-- Verify the update
SELECT id, email, full_name, role FROM public.users WHERE id = '379ffaaa-e40a-4f51-9ea3-8a3946ff4f74';
