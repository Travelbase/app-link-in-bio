CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.internal_job_secrets (
  name text PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_job_secrets TO service_role;
ALTER TABLE public.internal_job_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server only job secrets" ON public.internal_job_secrets FOR ALL TO service_role USING (true) WITH CHECK (true);
INSERT INTO public.internal_job_secrets (name, secret)
VALUES ('instagram_daily', encode(extensions.gen_random_bytes(32), 'hex'));

CREATE TABLE public.instagram_disconnect_notices (
  page_id uuid PRIMARY KEY REFERENCES public.pages(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'deauthorized',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.instagram_disconnect_notices TO service_role;
ALTER TABLE public.instagram_disconnect_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Server only disconnect notices" ON public.instagram_disconnect_notices FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.run_instagram_daily()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s text;
BEGIN
  SELECT secret INTO s FROM public.internal_job_secrets WHERE name = 'instagram_daily';
  PERFORM net.http_post(
    url := 'https://pqgcdnytqcrlgzyrouqi.supabase.co/functions/v1/instagram-daily',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-secret', s),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
END; $$;
REVOKE ALL ON FUNCTION public.run_instagram_daily() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('instagram-daily-sync', '0 5 * * *', 'SELECT public.run_instagram_daily();');