CREATE TABLE public.instagram_connections (
  page_id uuid PRIMARY KEY REFERENCES public.pages(id) ON DELETE CASCADE,
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
GRANT ALL ON public.instagram_connections TO service_role;
ALTER TABLE public.instagram_connections ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER instagram_connections_updated_at BEFORE UPDATE ON public.instagram_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.instagram_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
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
GRANT SELECT ON public.instagram_posts TO anon, authenticated;
GRANT UPDATE (link_url, is_hidden) ON public.instagram_posts TO anon, authenticated;
GRANT ALL ON public.instagram_posts TO service_role;
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prototype open read Instagram posts" ON public.instagram_posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Prototype edit Instagram links and visibility" ON public.instagram_posts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX instagram_posts_page_date_idx ON public.instagram_posts(page_id, posted_at DESC);
CREATE TRIGGER instagram_posts_updated_at BEFORE UPDATE ON public.instagram_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE VIEW public.instagram_connection_status WITH (security_barrier = true) AS
SELECT page_id, username, last_synced_at, last_error FROM public.instagram_connections;
REVOKE ALL ON public.instagram_connection_status FROM PUBLIC;
GRANT SELECT ON public.instagram_connection_status TO anon, authenticated, service_role;

CREATE TABLE public.instagram_oauth_states (
  state_hash text PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  return_origin text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.instagram_oauth_states TO service_role;
ALTER TABLE public.instagram_oauth_states ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER instagram_oauth_states_updated_at BEFORE UPDATE ON public.instagram_oauth_states FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();