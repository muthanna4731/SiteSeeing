-- Run in Supabase dashboard SQL editor (project jwlewgvkawbuguwerujy).
-- Mirrors migrations/20260802000000_add_site_spec_fields.sql, which was never
-- pushed to the remote DB — hence "Could not find the 'contact' column of 'plots'
-- in the schema cache" when saving a property from the dashboard.
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS site_no TEXT;
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS facing TEXT;
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS location_text TEXT;
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS contact TEXT;

-- Force PostgREST to drop its cached schema so supabase-js sees the new columns.
NOTIFY pgrst, 'reload schema';
