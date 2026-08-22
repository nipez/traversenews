// @ts-ignore `.open-next/worker.js` is generated at OpenNext build time
import { default as handler } from "./.open-next/worker.js";

type PullEnv = {
  WORKER_SELF_REFERENCE: { fetch: typeof fetch };
};

export default {
  fetch: handler.fetch,

  /**
   * Weekday morning pull (see wrangler.jsonc triggers.crons).
   * Hits our own /api/pull so Next route handlers + KV bindings run as usual.
   * Test locally: wrangler dev --test-scheduled
   *   curl "http://localhost:8787/__scheduled?cron=30+11+*+*+1-5"
   */
  async scheduled(
    _controller: ScheduledController,
    env: PullEnv,
    ctx: ExecutionContext,
  ) {
    const self = env.WORKER_SELF_REFERENCE;
    ctx.waitUntil(
      (async () => {
        const res = await self.fetch(
          new Request("https://traverse-news.internal/api/pull", {
            method: "POST",
          }),
        );
        const body = await res.text();
        console.log(`scheduled pull status=${res.status} body=${body.slice(0, 500)}`);
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
