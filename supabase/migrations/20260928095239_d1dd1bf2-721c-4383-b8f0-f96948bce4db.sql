SELECT cron.unschedule('instagram-daily-sync');
CREATE FUNCTION public.run_instagram_daily()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  endpoint text;
  service_key text;
BEGIN
  SELECT decrypted_secret INTO endpoint FROM vault.decrypted_secrets WHERE name = 'instagram_daily_url' LIMIT 1;
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'instagram_daily_service_key' LIMIT 1;
  IF endpoint IS NULL OR service_key IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(url := endpoint, headers := jsonb_build_object('Authorization', 'Bearer ' || service_key, 'Content-Type', 'application/json'), body := '{}'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.run_instagram_daily() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_instagram_daily() TO service_role;
SELECT cron.schedule('instagram-daily-sync', '0 5 * * *', 'SELECT public.run_instagram_daily()');