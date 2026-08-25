// @ts-ignore `.open-next/worker.js` is generated at OpenNext build time
import { default as handler } from "./.open-next/worker.js";

const PULL_CRON = "30 11 * * 1-5";
const LETTER_CRON = "0 12 * * 1-6";

type WorkerEnv = {
  WORKER_SELF_REFERENCE: { fetch: typeof fetch };
  DESK_IMPORT_TOKEN?: string;
  DEV_DESK_PASSWORD?: string;
};

export default {
  fetch: handler.fetch,

  /**
   * Weekday morning pull + Mon-Sat morning letter (see wrangler.jsonc
   * triggers.crons). Hits our own routes so Next handlers + KV bindings run
   * as usual.
   *
   * Test locally: wrangler dev --test-scheduled
   *   curl "http://localhost:8787/__scheduled?cron=30+11+*+*+1-5"
   *   curl "http://localhost:8787/__scheduled?cron=0+12+*+*+1-6"
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
                body: "{}",
              },
            ),
          );
          const body = await res.text();
          console.log(
            `scheduled letter status=${res.status} body=${body.slice(0, 500)}`,
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
