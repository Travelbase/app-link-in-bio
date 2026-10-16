/**
 * Where the app lives. The Lovable preview runs at the root with public pages at /<address>.
 * Production runs under /a/link-in-bio/ behind the apps gateway, which only lets visitors
 * without a login through /a/link-in-bio/public/…, so public pages live there.
 * VITE_APP_BASE is only set by the production build (see Dockerfile).
 */
const base = (import.meta.env.VITE_APP_BASE as string | undefined) ?? "/";

/** Prefix for app paths, always ending in a slash. */
export const APP_BASE = base.endsWith("/") ? base : `${base}/`;
/** Router basename: without the trailing slash, so /a/link-in-bio opens the editor as /a/link-in-bio/ does. */
export const routerBasename = (appBase: string) => appBase.replace(/(.)\/$/, "$1");
/** Path segment in front of a public page's address. */
export const PUBLIC_SEGMENT = base === "/" ? "" : "public/";

/** Full URL of a public page. */
export const publicPageUrl = (address: string) => `${window.location.origin}${APP_BASE}${PUBLIC_SEGMENT}${address}`;
/** What the address fields show in front of the address, e.g. "apps.travelbase.eu/a/link-in-bio/public/". */
export const publicHostPrefix = () => `${window.location.host}${APP_BASE}${PUBLIC_SEGMENT}`;
/** Browser path of the editor for a page. */
export const editPath = (address: string) => `${APP_BASE}edit/${address}`;
