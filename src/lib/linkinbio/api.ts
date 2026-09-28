import { supabase } from "@/integrations/supabase/client";
import type { BlockData, PageData } from "./types";

export async function fetchPageByAddress(address: string): Promise<{ page: PageData; blocks: BlockData[] } | null> {
  const { data: page, error } = await supabase.from("pages").select("*").eq("address", address.toLowerCase()).maybeSingle();
  if (error) throw error;
  if (!page) return null;
  const { data: blocks, error: bErr } = await supabase.from("blocks").select("*").eq("page_id", page.id).order("position");
  if (bErr) throw bErr;
  return { page: page as unknown as PageData, blocks: (blocks ?? []) as unknown as BlockData[] };
}

export async function fetchPages() {
  const { data, error } = await supabase.from("pages").select("id,address,display_name,instagram_handle").order("display_name");
  if (error) throw error;
  return data ?? [];
}
