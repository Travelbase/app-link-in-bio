/** Everything the server reads from its environment. Secrets come from Secret Manager as env vars. */
const env = (name: string) => process.env[name]?.trim() || "";

export const config = {
  appId: "link-in-bio",
  basePath: "/a/link-in-bio/",
  /** Where the gateway serves the app, e.g. https://apps.travelbase.eu/a/link-in-bio */
  appUrl: () => `${(env("PUBLIC_URL") || "https://apps.travelbase.eu").replace(/\/+$/, "")}/a/link-in-bio`,
  databaseUrl: () => env("DATABASE_URL"),
  imageBucket: () => env("IMAGE_BUCKET"),
  instagram: {
    appId: () => env("INSTAGRAM_APP_ID"),
    appSecret: () => env("INSTAGRAM_APP_SECRET"),
  },
  bitly: {
    token: () => env("BITLY_TOKEN"),
    /** Optional: the Bitly group to create links in; Bitly's default group otherwise. */
    groupGuid: () => env("BITLY_GROUP_GUID"),
    domain: () => env("BITLY_DOMAIN") || "bit.ly",
  },
};

export const publicPageUrl = (address: string) => `${config.appUrl()}/public/${address}`;

/** Config the service runs without, but with a feature switched off. Logged at boot. */
export function missingConfig(): string[] {
  const missing: [string, string][] = [
    ["DATABASE_URL", config.databaseUrl()],
    ["IMAGE_BUCKET", config.imageBucket()],
    ["INSTAGRAM_APP_ID", config.instagram.appId()],
    ["INSTAGRAM_APP_SECRET", config.instagram.appSecret()],
    ["BITLY_TOKEN", config.bitly.token()],
  ];
  return missing.filter(([, v]) => !v).map(([k]) => k);
}
