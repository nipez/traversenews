import { STORE_KEY } from "./kv";

export const BACKUP_RETENTION_DAYS = 30;

type KvGet = {
  get(key: string): Promise<string | null>;
};

type R2Backups = {
  put(
    key: string,
    value: string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  list(options?: {
    prefix?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{
    objects: { key: string }[];
    truncated: boolean;
    cursor?: string;
  }>;
  delete(keys: string | string[]): Promise<void>;
};

export type KvBackupOk = {
  ok: true;
  date: string;
  bytes: number;
  datedKey: string;
  deleted: number;
};

export type KvBackupFail = {
  ok: false;
  date: string;
  reason: "missing" | "missing_binding";
};

export type KvBackupResult = KvBackupOk | KvBackupFail;

export function detroitDateKey(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Detroit" });
}

function daysAgoDetroit(days: number): string {
  const ms = Date.now() - days * 24 * 60 * 60 * 1000;
  return detroitDateKey(new Date(ms));
}

/**
 * Delete dated kv/YYYY-MM-DD/ objects older than retention.
 * Never touches kv/latest.json. Does not read or log object bodies.
 */
async function cleanupOldKvBackups(
  r2: R2Backups,
  cutoffDate: string,
): Promise<number> {
  const toDelete: string[] = [];
  let cursor: string | undefined;
  do {
    const listed = await r2.list({
      prefix: "kv/",
      cursor,
      limit: 1000,
    });
    for (const obj of listed.objects) {
      const m = /^kv\/(\d{4}-\d{2}-\d{2})\//.exec(obj.key);
      const day = m?.[1];
      if (day && day < cutoffDate) {
        toDelete.push(obj.key);
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  for (let i = 0; i < toDelete.length; i += 1000) {
    await r2.delete(toDelete.slice(i, i + 1000));
  }
  return toDelete.length;
}

/**
 * Snapshot live KV `app_data` into private R2 `traverse-news-backups`.
 * Writes `kv/YYYY-MM-DD/app_data.json` and `kv/latest.json`.
 * Never returns or logs the JSON body.
 */
export async function snapshotAppDataToBackups(args: {
  kv: KvGet | null | undefined;
  r2: R2Backups | null | undefined;
}): Promise<KvBackupResult> {
  const dateKey = detroitDateKey();
  const { kv, r2 } = args;
  if (!kv || !r2) {
    return { ok: false, date: dateKey, reason: "missing_binding" };
  }

  const json = await kv.get(STORE_KEY);
  if (json == null) {
    return { ok: false, date: dateKey, reason: "missing" };
  }

  const bytes = new TextEncoder().encode(json).byteLength;
  const httpMetadata = { contentType: "application/json" };
  const datedKey = `kv/${dateKey}/app_data.json`;

  await r2.put(datedKey, json, { httpMetadata });
  await r2.put("kv/latest.json", json, { httpMetadata });

  let deleted = 0;
  try {
    deleted = await cleanupOldKvBackups(
      r2,
      daysAgoDetroit(BACKUP_RETENTION_DAYS),
    );
  } catch {
    // Snapshot matters more than cleanup.
  }

  return { ok: true, date: dateKey, bytes, datedKey, deleted };
}

export async function getTraverseBackupsR2(): Promise<R2Backups | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const r2 = (ctx.env as CloudflareEnv | undefined)?.TRAVERSE_BACKUPS;
    if (
      r2 &&
      typeof r2.put === "function" &&
      typeof r2.list === "function" &&
      typeof r2.delete === "function"
    ) {
      return r2 as R2Backups;
    }
  } catch {
    // Plain next dev without Cloudflare context, or missing binding.
  }
  return null;
}
