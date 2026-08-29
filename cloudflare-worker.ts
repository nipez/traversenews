// @ts-ignore `.open-next/worker.js` is generated at OpenNext build time
import { default as handler } from "./.open-next/worker.js";
import { snapshotAppDataToBackups } from "./src/lib/data/kv-backup";

const PULL_CRON = "30 11 * * 1-6";
const LETTER_CRON = "0 12 * * 1-6";
/** 2am America/Detroit during EDT (UTC-4). EST → `0 7 * * *`. */
const BACKUP_CRON = "0 6 * * *";

type WorkerEnv = {
  WORKER_SELF_REFERENCE: { fetch: typeof fetch };
  TRAVERSE_DATA: KVNamespace;
  TRAVERSE_BACKUPS: R2Bucket;
  DESK_IMPORT_TOKEN?: string;
  DEV_DESK_PASSWORD?: string;
};

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
   * Mon–Sat morning pull + Mon–Sat Nick-only letter preview + nightly KV→R2
   * backup (see wrangler.jsonc triggers.crons). Live/public send is from Desk,
   * not the letter cron. Backup uses TRAVERSE_DATA + TRAVERSE_BACKUPS directly
   * (no WORKER_SELF_REFERENCE, no public HTTP route for the cron itself).
   * On-demand: POST /api/desk/backup (Desk cookie or Bearer).
   *
   * Test locally: wrangler dev --test-scheduled
   *   curl "http://localhost:8787/__scheduled?cron=30+11+*+*+1-6"
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
          const result = await snapshotAppDataToBackups({
            kv: env.TRAVERSE_DATA,
            r2: env.TRAVERSE_BACKUPS,
          });
          if (!result.ok) {
            console.log(
              `scheduled kv backup status=${result.reason} date=${result.date}`,
            );
            return;
          }
          console.log(
            `scheduled kv backup status=ok date=${result.date} bytes=${result.bytes} dated=${result.datedKey} latest=kv/latest.json deleted=${result.deleted}`,
          );
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
