-- Links imported from Later with http:// were flagged as invalid and hidden. Same sites, over https.
update blocks
set content = regexp_replace(content::text, '"(url|default_url)": "http://', '"\1": "https://', 'g')::jsonb
where content::text ~ '"(url|default_url)": "http://';
