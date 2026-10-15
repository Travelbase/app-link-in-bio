-- Production schema on Cloud SQL, derived from supabase/migrations (Lovable Cloud).
-- Left out: RLS, grants and storage policies (only the server reaches this database), pg_cron
-- (the daily sync is the Cloud Run Job link-in-bio-daily) and the analytics tables (visits come
-- from Bitly). Added: page_short_links, which only production has.
-- Keep it additive: Lovable's migrations get ported here when lovable is merged into main.

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL UNIQUE CHECK (address ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  instagram_handle text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  background_type text NOT NULL DEFAULT 'color' CHECK (background_type IN ('color','image')),
  background_color text NOT NULL DEFAULT '#ffffff',
  background_image_url text,
  text_color text NOT NULL DEFAULT '#000000',
  font text NOT NULL DEFAULT 'playfair-dmsans' CHECK (font IN ('playfair-dmsans','montserrat','roboto','dmsans')),
  block_color text NOT NULL DEFAULT '#eeeeee',
  block_text_color text NOT NULL DEFAULT '#000000',
  block_shape text NOT NULL DEFAULT 'rounded' CHECK (block_shape IN ('round_sides','rounded','square')),
  block_style text NOT NULL DEFAULT 'solid' CHECK (block_style IN ('solid','outline')),
  block_shadow text NOT NULL DEFAULT 'soft' CHECK (block_shadow IN ('none','soft','hard')),
  button_accent_color text,
  footer_logo_url text,
  market text NOT NULL DEFAULT 'NL' CONSTRAINT pages_market_check CHECK (market IN ('NL','BE','FR','DE','UK')),
  show_travelbase_logo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pages_address_not_reserved CHECK (address NOT IN ('edit','admin','api','settings','data-deletion','instagram-callback','public'))
);
CREATE TRIGGER pages_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('profile','social_icons','button','button_group','featured_banner','carousel','instagram_grid')),
  position integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blocks_page_position_idx ON blocks(page_id, position);
CREATE TRIGGER blocks_updated_at BEFORE UPDATE ON blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE page_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  design jsonb NOT NULL DEFAULT '{}'::jsonb,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER page_templates_updated_at BEFORE UPDATE ON page_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE instagram_connections (
  page_id uuid PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
  instagram_user_id text NOT NULL,
  username text NOT NULL,
  access_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  token_issued_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER instagram_connections_updated_at BEFORE UPDATE ON instagram_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE instagram_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  instagram_media_id text NOT NULL UNIQUE,
  media_type text NOT NULL CHECK (media_type IN ('IMAGE','VIDEO','CAROUSEL_ALBUM')),
  caption text NOT NULL DEFAULT '',
  permalink text NOT NULL DEFAULT '',
  posted_at timestamptz NOT NULL,
  image_url text NOT NULL,
  link_url text NOT NULL DEFAULT '',
  is_hidden boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX instagram_posts_page_date_idx ON instagram_posts(page_id, posted_at DESC);
CREATE TRIGGER instagram_posts_updated_at BEFORE UPDATE ON instagram_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE instagram_oauth_states (
  state_hash text PRIMARY KEY,
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  return_origin text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE instagram_pending_connections (
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

CREATE TABLE instagram_disconnect_notices (
  page_id uuid PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'deauthorized',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One bit.ly link per page address. A renamed page gets a new one; the old link keeps working.
CREATE TABLE page_short_links (
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  address text NOT NULL,
  bitlink text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, address)
);

-- The standard template, one row per language (same seed as Lovable Cloud).
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
    INSERT INTO page_templates (key, name, design, blocks) VALUES (m.key, m.name, design, jsonb_build_array(
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
