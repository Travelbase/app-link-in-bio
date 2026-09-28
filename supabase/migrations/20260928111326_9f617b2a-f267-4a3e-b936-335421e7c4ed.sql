CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view','button_click','post_click')),
  block_id uuid,
  block_type text,
  item_label text,
  destination text,
  country text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server only analytics events" ON public.analytics_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX analytics_events_page_time ON public.analytics_events (page_id, created_at);

CREATE OR REPLACE FUNCTION public.analytics_daily(_page uuid, _from date, _to date)
RETURNS TABLE(day date, views bigint, button_clicks bigint, post_clicks bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT d::date,
    count(e.id) FILTER (WHERE e.event_type='view'),
    count(e.id) FILTER (WHERE e.event_type='button_click'),
    count(e.id) FILTER (WHERE e.event_type='post_click')
  FROM generate_series(_from, _to, interval '1 day') d
  LEFT JOIN analytics_events e ON e.page_id=_page AND (e.created_at AT TIME ZONE 'Europe/Amsterdam')::date = d::date
  GROUP BY d ORDER BY d;
$$;

CREATE OR REPLACE FUNCTION public.analytics_top_links(_page uuid, _from date, _to date)
RETURNS TABLE(item_label text, block_type text, destination text, clicks bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(nullif(item_label,''),'—'), coalesce(block_type,''), coalesce(destination,''), count(*)
  FROM analytics_events
  WHERE page_id=_page AND event_type<>'view'
    AND (created_at AT TIME ZONE 'Europe/Amsterdam')::date BETWEEN _from AND _to
  GROUP BY 1,2,3 ORDER BY 4 DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.analytics_locations(_page uuid, _from date, _to date)
RETURNS TABLE(country text, city text, views bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT country, city, count(*)
  FROM analytics_events
  WHERE page_id=_page AND event_type='view'
    AND (created_at AT TIME ZONE 'Europe/Amsterdam')::date BETWEEN _from AND _to
  GROUP BY 1,2;
$$;

REVOKE ALL ON FUNCTION public.analytics_daily(uuid,date,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_top_links(uuid,date,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_locations(uuid,date,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_daily(uuid,date,date) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_top_links(uuid,date,date) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_locations(uuid,date,date) TO service_role;