// @ts-ignore `.open-next/worker.js` is generated at OpenNext build time
import { default as handler } from "./.open-next/worker.js";

const PULL_CRON = "30 11 * * 1-5";
const LETTER_CRON = "0 12 * * 1-6";
/** 2am America/Detroit during EDT (UTC-4). EST → `0 7 * * *`. */
const BACKUP_CRON = "0 6 * * *";
const STORE_KEY = "app_data";
const BACKUP_RETENTION_DAYS = 30;

type WorkerEnv = {
  WORKER_SELF_REFERENCE: { fetch: typeof fetch };
  TRAVERSE_DATA: KVNamespace;
  TRAVERSE_BACKUPS: R2Bucket;
  DESK_IMPORT_TOKEN?: string;
  DEV_DESK_PASSWORD?: string;
};

function detroitDateKey(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Detroit" });
}

function daysAgoDetroit(days: number): string {
  const ms = Date.now() - days * 24 * 60 * 60 * 1000;
  return detroitDateKey(new Date(ms));
}

/**
 * Delete dated kv/YYYY-MM-DD/ objects older than retention.
 * Never touches kv/latest.json. Logs counts only (no object bodies).
 */
async function cleanupOldKvBackups(
  r2: R2Bucket,
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
      if (m && m[1]! < cutoffDate) {
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

async function snapshotAppDataToR2(env: WorkerEnv): Promise<void> {
  const dateKey = detroitDateKey();
  if (!env.TRAVERSE_DATA || !env.TRAVERSE_BACKUPS) {
    console.log(
      `scheduled kv backup status=missing_binding date=${dateKey} has_kv=${Boolean(env.TRAVERSE_DATA)} has_r2=${Boolean(env.TRAVERSE_BACKUPS)}`,
    );
    return;
  }

  const json = await env.TRAVERSE_DATA.get(STORE_KEY);
  if (json == null) {
    console.log(
      `scheduled kv backup status=missing key=${STORE_KEY} date=${dateKey}`,
    );
    return;
  }

  const bytes = new TextEncoder().encode(json).byteLength;
  const httpMetadata = { contentType: "application/json" };
  const datedKey = `kv/${dateKey}/app_data.json`;

  await env.TRAVERSE_BACKUPS.put(datedKey, json, { httpMetadata });
  await env.TRAVERSE_BACKUPS.put("kv/latest.json", json, { httpMetadata });

  let deleted = 0;
  try {
    deleted = await cleanupOldKvBackups(
      env.TRAVERSE_BACKUPS,
      daysAgoDetroit(BACKUP_RETENTION_DAYS),
    );
  } catch (err) {
    console.log(
      `scheduled kv backup cleanup_error=${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  console.log(
    `scheduled kv backup status=ok date=${dateKey} bytes=${bytes} dated=${datedKey} latest=kv/latest.json deleted=${deleted}`,
  );
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.hostname === "www.traverse.news") {
      url.hostname = "traverse.news";
      url.protocol = "https:";
      url.port = "";
      return Response.redirect(url.toString(), 308);
    }
    // stub worker.js types fetch() with 0 args during next build
    return (handler.fetch as (
      request: Request,
      env: unknown,
      ctx: ExecutionContext,
    ) => Promise<Response> | Response)(request, env, ctx);
  },

  /**
   * Weekday morning pull + Mon-Sat Nick-only letter preview + nightly KV→R2
   * backup (see wrangler.jsonc triggers.crons). Live/public send is from Desk,
   * not the letter cron. Backup uses TRAVERSE_DATA + TRAVERSE_BACKUPS directly
   * (no WORKER_SELF_REFERENCE, no public HTTP route).
   *
   * Test locally: wrangler dev --test-scheduled
   *   curl "http://localhost:8787/__scheduled?cron=30+11+*+*+1-5"
   *   curl "http://localhost:8787/__scheduled?cron=0+12+*+*+1-6"
   *   curl "http://localhost:8787/__scheduled?cron=0+6+*+*+*"
   */
  async scheduled(
    controller: ScheduledController,
    env: WorkerEnv,
    ctx: ExecutionContext,
  ) {
    const self = env.WORKER_SELF_REFERENCE;
    const cron = controller.cron;

    ctx.waitUntil(
      (async () => {
        if (cron === BACKUP_CRON) {
          await snapshotAppDataToR2(env);
          return;
        }

        if (cron === LETTER_CRON) {
          const bearer =
            env.DESK_IMPORT_TOKEN?.trim() ||
            env.DEV_DESK_PASSWORD?.trim() ||
            "desk";
          const res = await self.fetch(
            new Request(
              "https://traverse-news.internal/api/desk/email/send",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${bearer}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ preview: true }),
              },
            ),
          );
          const body = await res.text();
          console.log(
            `scheduled letter preview status=${res.status} body=${body.slice(0, 500)}`,
          );
          return;
        }

        if (cron === PULL_CRON) {
          const res = await self.fetch(
            new Request("https://traverse-news.internal/api/pull", {
              method: "POST",
            }),
          );
          const body = await res.text();
          console.log(
            `scheduled pull status=${res.status} body=${body.slice(0, 500)}`,
          );
          return;
        }

        console.log(`scheduled unknown cron=${cron}`);
      })(),
    );
  },
};

// @ts-ignore generated at OpenNext build time
export {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from "./.open-next/worker.js";
