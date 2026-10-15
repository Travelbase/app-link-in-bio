-- A back-half the team picked in the editor (bit.ly/<custom>). It points at the same bitlink, so the
-- visits keep coming from `bitlink`; the editor shows the custom one.
alter table page_short_links add column if not exists custom_link text;
