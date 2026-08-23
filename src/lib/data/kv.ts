export const STORE_KEY = "app_data";

type KvLike = {
  get(key: string, type?: "text"): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

export async function getTraverseDataKv(): Promise<KvLike | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const kv = (ctx.env as CloudflareEnv | undefined)?.TRAVERSE_DATA;
    if (kv && typeof kv.get === "function" && typeof kv.put === "function") {
      return kv as KvLike;
    }
  } catch {
    // Plain `next dev` without Cloudflare context, or missing binding.
  }
  return null;
}
