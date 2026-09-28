/** Change the utm_source pattern here — used for every outgoing link. */
export const utmSourceFor = (address: string) => `linkinbio-${address}`;
export const UTM_MEDIUM = "referral";

/** Strip spaces, punctuation and emoji, keeping letters and digits. */
const clean = (label: string) => (label || "").replace(/[^\p{L}\p{N}]/gu, "");

export function withUtm(url: string, address: string, blockType: string, label: string): string {
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) return url; // leaves mailto:, tel:, etc. untouched
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", utmSourceFor(address));
    u.searchParams.set("utm_medium", UTM_MEDIUM);
    u.searchParams.set("utm_campaign", `${blockType}_${clean(label)}`);
    return u.toString();
  } catch {
    return url;
  }
}
