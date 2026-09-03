-- ALL MIGRATIONS, IN ORDER, AS ONE SCRIPT.
--
-- Why this file exists: the Supabase CLI cannot reach project
-- jwlewgvkawbuguwerujy from the dev machine (403 "account does not have the
-- necessary privileges" on the login role, and only the anon key is stored
-- locally, which cannot run DDL). So migrations are applied by hand from the
-- dashboard SQL editor instead of `supabase db push`.
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste all of
-- this -> Run.
--
-- Safe to run in full even though most of it is already applied. Every
-- statement is idempotent: CREATE TABLE / ADD COLUMN use IF NOT EXISTS,
-- policies are dropped before being recreated, and the storage bucket insert
-- uses ON CONFLICT DO NOTHING. Existing rows are never touched.
--
-- As of 2026-09-03 the remote database already had everything through
-- 20260616000000; the 20260802000000 block is the one that was missing and
-- caused "Could not find the 'contact' column of 'plots' in the schema cache"
-- when saving a property from the dashboard.

-- ===========================================================
-- 20260528000000_init_plots.sql
-- ===========================================================
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create plots table
CREATE TABLE IF NOT EXISTS public.plots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    size TEXT NOT NULL,
    price TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    image TEXT,
    gallery TEXT[],
    description TEXT,
    documents TEXT[]
);

-- Explicitly expose the table to the Data API (PostgREST / supabase-js).
-- Required for projects created on/after 2026-05-30, where public-schema
-- tables are no longer auto-granted. RLS policies below still govern access.
GRANT SELECT ON public.plots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plots TO authenticated;

-- Enable Row Level Security
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;

-- Plots policies (drop-then-create for idempotent re-runs)
DROP POLICY IF EXISTS "Allow public read access on plots" ON public.plots;
CREATE POLICY "Allow public read access on plots" ON public.plots
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert plots" ON public.plots;
CREATE POLICY "Allow authenticated users to insert plots" ON public.plots
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update plots" ON public.plots;
CREATE POLICY "Allow authenticated users to update plots" ON public.plots
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete plots" ON public.plots;
CREATE POLICY "Allow authenticated users to delete plots" ON public.plots
    FOR DELETE TO authenticated USING (true);

-- Create storage bucket for plot-images
INSERT INTO storage.buckets (id, name, public) VALUES ('plot-images', 'plot-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for plot-images (drop-then-create for idempotent re-runs)
DROP POLICY IF EXISTS "Allow public read access on plot-images" ON storage.objects;
CREATE POLICY "Allow public read access on plot-images" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'plot-images');

DROP POLICY IF EXISTS "Allow authenticated users to upload plot-images" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload plot-images" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'plot-images');

DROP POLICY IF EXISTS "Allow authenticated users to update plot-images" ON storage.objects;
CREATE POLICY "Allow authenticated users to update plot-images" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'plot-images') WITH CHECK (bucket_id = 'plot-images');

DROP POLICY IF EXISTS "Allow authenticated users to delete plot-images" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete plot-images" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'plot-images');

-- ===========================================================
-- 20260528120000_add_city.sql
-- ===========================================================
-- Add city column to plots
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS city TEXT;

-- ===========================================================
-- 20260528130000_inquiries.sql
-- ===========================================================
-- Inquiries submitted from the public contact form
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fullname TEXT NOT NULL,
    phone TEXT,
    message TEXT
);

-- Expose to the Data API (RLS still governs access).
GRANT INSERT ON public.inquiries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inquiries TO authenticated;

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) may submit an inquiry...
DROP POLICY IF EXISTS "Allow public insert on inquiries" ON public.inquiries;
CREATE POLICY "Allow public insert on inquiries" ON public.inquiries
    FOR INSERT TO anon WITH CHECK (true);

-- ...but only the authenticated broker may read / manage them.
DROP POLICY IF EXISTS "Allow authenticated read on inquiries" ON public.inquiries;
CREATE POLICY "Allow authenticated read on inquiries" ON public.inquiries
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated update on inquiries" ON public.inquiries;
CREATE POLICY "Allow authenticated update on inquiries" ON public.inquiries
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete on inquiries" ON public.inquiries;
CREATE POLICY "Allow authenticated delete on inquiries" ON public.inquiries
    FOR DELETE TO authenticated USING (true);

-- ===========================================================
-- 20260616000000_add_social_and_maps.sql
-- ===========================================================
-- Add per-property social and Google Maps link columns
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS fb_url TEXT;
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS insta_url TEXT;
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS maps_url TEXT;

-- `documents` (text[]) already exists and now stores uploaded document-image URLs.

-- ===========================================================
-- 20260802000000_add_site_spec_fields.sql
-- ===========================================================
-- Per-property spec fields so the broker can edit each detail on its own line
-- in the dashboard instead of maintaining one hand-written paragraph.
-- Dimension reuses the existing `size` column; `city` still drives the map filter.
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS site_no TEXT;
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS facing TEXT;
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS location_text TEXT;
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS contact TEXT;

-- ===========================================================
-- Force PostgREST to drop its cached schema so supabase-js sees any newly
-- added columns immediately instead of after the next automatic reload.
-- ===========================================================
NOTIFY pgrst, 'reload schema';
