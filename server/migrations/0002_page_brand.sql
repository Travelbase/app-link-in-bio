-- The Amigo brand a page took its colours from (Core brand code, e.g. OUT). Null: not linked.
alter table pages add column if not exists brand_code text;
