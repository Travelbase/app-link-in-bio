CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.pages (
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pages TO anon, authenticated;
GRANT ALL ON public.pages TO service_role;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prototype open read pages" ON public.pages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Prototype open write pages" ON public.pages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('profile','social_icons','button','button_group','featured_banner','carousel','instagram_grid')),
  position integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blocks_page_position_idx ON public.blocks(page_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocks TO anon, authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prototype open read blocks" ON public.blocks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Prototype open write blocks" ON public.blocks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER blocks_updated_at BEFORE UPDATE ON public.blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.page_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  design jsonb NOT NULL DEFAULT '{}'::jsonb,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_templates TO anon, authenticated;
GRANT ALL ON public.page_templates TO service_role;
ALTER TABLE public.page_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prototype open read templates" ON public.page_templates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Prototype open write templates" ON public.page_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER page_templates_updated_at BEFORE UPDATE ON public.page_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();