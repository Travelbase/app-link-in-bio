ALTER TABLE public.pages ADD COLUMN market text NOT NULL DEFAULT 'NL',
  ADD COLUMN show_travelbase_logo boolean NOT NULL DEFAULT false;
ALTER TABLE public.pages ADD CONSTRAINT pages_market_check CHECK (market IN ('NL','BE','FR','DE','UK'));
UPDATE public.pages SET show_travelbase_logo = true, footer_logo_url = NULL WHERE address = 'travelbase';

ALTER TABLE public.instagram_oauth_states ALTER COLUMN page_id DROP NOT NULL;

CREATE TABLE public.instagram_pending_connections (
  key_hash text PRIMARY KEY,
  instagram_user_id text NOT NULL,
  username text NOT NULL,
  name text NOT NULL DEFAULT '',
  profile_picture_url text NOT NULL DEFAULT '',
  access_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.instagram_pending_connections TO service_role;
ALTER TABLE public.instagram_pending_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server only pending Instagram connections" ON public.instagram_pending_connections FOR ALL TO service_role USING (true) WITH CHECK (true);

DO $$
DECLARE
  design jsonb := '{"background_type":"color","background_color":"#eaf1ee","text_color":"#3e6255","font":"montserrat","block_color":"#3e6255","block_text_color":"#ffffff","block_shape":"rounded","block_style":"solid","block_shadow":"soft","button_accent_color":"#e2572b","footer_logo_url":null,"show_travelbase_logo":false}';
  m record;
BEGIN
  FOR m IN SELECT * FROM (VALUES
    ('standard','Standard (Dutch)','Wat wordt jouw volgende avontuur?','Ontdek alle reizen','Naar de website','Reis','vanaf €…','Nieuwsbrief & acties'),
    ('standard-fr','Standard (French)','Quelle sera ta prochaine aventure ?','Découvre tous nos voyages','Vers le site','Voyage','à partir de €…','Newsletter & promos'),
    ('standard-de','Standard (German)','Was wird dein nächstes Abenteuer?','Entdecke alle Reisen','Zur Website','Reise','ab €…','Newsletter & Aktionen'),
    ('standard-uk','Standard (English)','What will your next adventure be?','Discover all trips','Visit the website','Trip','from €…','Newsletter & offers')
  ) AS v(key,name,tagline,btitle,bbutton,card,sub,news)
  LOOP
    INSERT INTO public.page_templates (key, name, design, blocks) VALUES (m.key, m.name, design, jsonb_build_array(
      jsonb_build_object('type','profile','is_visible',true,'content',jsonb_build_object('avatar_url','','name','','tagline',m.tagline)),
      jsonb_build_object('type','social_icons','is_visible',true,'content',jsonb_build_object('items',jsonb_build_array(
        jsonb_build_object('platform','instagram','url','https://instagram.com/'),
        jsonb_build_object('platform','website','url',''),
        jsonb_build_object('platform','tiktok','url',''),
        jsonb_build_object('platform','facebook','url',''),
        jsonb_build_object('platform','email','url','')))),
      jsonb_build_object('type','featured_banner','is_visible',true,'content',jsonb_build_object('image_url','','title',m.btitle,'subtitle','','button_label',m.bbutton,'url','')),
      jsonb_build_object('type','carousel','is_visible',true,'content',jsonb_build_object('items',jsonb_build_array(
        jsonb_build_object('image_url','','title',m.card||' 1','subtitle',m.sub,'url',''),
        jsonb_build_object('image_url','','title',m.card||' 2','subtitle',m.sub,'url',''),
        jsonb_build_object('image_url','','title',m.card||' 3','subtitle',m.sub,'url','')))),
      jsonb_build_object('type','button','is_visible',true,'content',jsonb_build_object('label',m.news,'url','')),
      jsonb_build_object('type','instagram_grid','is_visible',true,'content',jsonb_build_object('default_url','','posts','[]'::jsonb))
    ))
    ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, design = EXCLUDED.design, blocks = EXCLUDED.blocks;
  END LOOP;
END $$;