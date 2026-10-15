-- Drafts: the editor saves to `draft` ({ page, blocks }); the pages + blocks rows stay what
-- visitors see until someone publishes. Null draft = nothing unpublished. Existing pages count as
-- published now (the default fills them without touching updated_at).
alter table pages add column if not exists draft jsonb;
alter table pages add column if not exists published_at timestamptz not null default now();
