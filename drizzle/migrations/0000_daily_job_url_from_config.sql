CREATE OR REPLACE FUNCTION public.run_instagram_daily()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s text; base text;
BEGIN
  SELECT secret INTO s FROM public.internal_job_secrets WHERE name = 'instagram_daily';
  SELECT secret INTO base FROM public.internal_job_secrets WHERE name = 'functions_base_url';
  IF s IS NULL OR base IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := rtrim(base, '/') || '/instagram-daily',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-secret', s),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
END; $$;
REVOKE ALL ON FUNCTION public.run_instagram_daily() FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.run_instagram_daily() IS 'Calls the instagram-daily function at internal_job_secrets[functions_base_url]; each environment sets its own row.';