-- Drafts: the editor saves to `draft` ({ page, blocks }); the pages + blocks rows stay what
-- visitors see until someone publishes. Null draft = nothing unpublished.
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS draft jsonb;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS published_at timestamptz NOT NULL DEFAULT now();
