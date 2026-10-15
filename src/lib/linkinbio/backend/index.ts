import { httpBackend } from "./http";
import { supabaseBackend } from "./supabase";
import type { LinkInBioBackend } from "./types";

/** "http" in the production build (GCP); Supabase everywhere else, the Lovable preview included. */
export const backend: LinkInBioBackend = import.meta.env.VITE_DATA_BACKEND === "http" ? httpBackend : supabaseBackend;

export type * from "./types";
