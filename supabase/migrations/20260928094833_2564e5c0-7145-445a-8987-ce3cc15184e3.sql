DROP VIEW public.instagram_connection_status;
CREATE FUNCTION public.instagram_connection_status(p_page_id uuid)
RETURNS TABLE(page_id uuid, username text, last_synced_at timestamptz, last_error text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.page_id, c.username, c.last_synced_at, c.last_error
  FROM public.instagram_connections c WHERE c.page_id = p_page_id
$$;
REVOKE ALL ON FUNCTION public.instagram_connection_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.instagram_connection_status(uuid) TO anon, authenticated, service_role;
CREATE POLICY "Server manages Instagram connections" ON public.instagram_connections FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Server manages Instagram connection requests" ON public.instagram_oauth_states FOR ALL TO service_role USING (true) WITH CHECK (true);