CREATE POLICY "Prototype open read page images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'page-images');
CREATE POLICY "Prototype open upload page images" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'page-images');
CREATE POLICY "Prototype open update page images" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'page-images') WITH CHECK (bucket_id = 'page-images');
CREATE POLICY "Prototype open delete page images" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'page-images');