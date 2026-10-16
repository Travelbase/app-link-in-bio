CREATE OR REPLACE FUNCTION public.is_travelbase_staff()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(lower(auth.jwt() ->> 'email') LIKE '%@travelbase.eu', false)
$$;
GRANT EXECUTE ON FUNCTION public.is_travelbase_staff() TO anon, authenticated;

DROP POLICY IF EXISTS "Prototype open write pages" ON public.pages;
DROP POLICY IF EXISTS "Prototype open write blocks" ON public.blocks;
DROP POLICY IF EXISTS "Prototype open write templates" ON public.page_templates;
DROP POLICY IF EXISTS "Prototype edit Instagram links and visibility" ON public.instagram_posts;

CREATE POLICY "Staff write pages" ON public.pages FOR ALL TO authenticated USING (public.is_travelbase_staff()) WITH CHECK (public.is_travelbase_staff());
CREATE POLICY "Staff write blocks" ON public.blocks FOR ALL TO authenticated USING (public.is_travelbase_staff()) WITH CHECK (public.is_travelbase_staff());
CREATE POLICY "Staff write templates" ON public.page_templates FOR ALL TO authenticated USING (public.is_travelbase_staff()) WITH CHECK (public.is_travelbase_staff());
CREATE POLICY "Staff edit Instagram links and visibility" ON public.instagram_posts FOR UPDATE TO authenticated USING (public.is_travelbase_staff()) WITH CHECK (public.is_travelbase_staff());

DROP POLICY IF EXISTS "Prototype open upload page images" ON storage.objects;
DROP POLICY IF EXISTS "Prototype open update page images" ON storage.objects;
DROP POLICY IF EXISTS "Prototype open delete page images" ON storage.objects;
CREATE POLICY "Staff upload page images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'page-images' AND public.is_travelbase_staff());
CREATE POLICY "Staff update page images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'page-images' AND public.is_travelbase_staff()) WITH CHECK (bucket_id = 'page-images' AND public.is_travelbase_staff());
CREATE POLICY "Staff delete page images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'page-images' AND public.is_travelbase_staff());

REVOKE INSERT, UPDATE, DELETE ON public.pages, public.blocks, public.page_templates, public.instagram_posts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pages, public.blocks, public.page_templates TO authenticated;
GRANT SELECT, UPDATE ON public.instagram_posts TO authenticated;