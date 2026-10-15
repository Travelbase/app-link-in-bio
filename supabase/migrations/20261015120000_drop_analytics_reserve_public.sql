-- Page visits now come from Bitly (production) and button clicks from GA4 via UTM tags,
-- so the home-made analytics go. "public" is reserved: production serves public pages under /public/.
DROP FUNCTION IF EXISTS public.analytics_daily(uuid, date, date);
DROP FUNCTION IF EXISTS public.analytics_top_links(uuid, date, date);
DROP FUNCTION IF EXISTS public.analytics_locations(uuid, date, date);
DROP TABLE IF EXISTS public.analytics_events;
ALTER TABLE public.pages DROP CONSTRAINT IF EXISTS pages_address_not_reserved;
ALTER TABLE public.pages ADD CONSTRAINT pages_address_not_reserved CHECK (address NOT IN ('edit','admin','api','settings','data-deletion','instagram-callback','public'));
