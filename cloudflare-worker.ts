// @ts-ignore `.open-next/worker.js` is generated at OpenNext build time
import { default as handler } from "./.open-next/worker.js";

type PullEnv = {
  WORKER_SELF_REFERENCE: { fetch: typeof fetch };
};

const PULL_CRON = "30 11 * * 1-5";

async function hitInternal(
  self: PullEnv["WORKER_SELF_REFERENCE"],
  path: string,
  label: string,
) {
  const res = await self.fetch(
    new Request(`https://traverse-news.internal${path}`, {
      method: "POST",
    }),
  );
  const body = await res.text();
  console.log(
    `scheduled ${label} status=${res.status} body=${body.slice(0, 500)}`,
  );
}

export default {
  fetch: handler.fetch,

  /**
   * Crons (see wrangler.jsonc triggers.crons):
   * - every 5 minutes → publish due Desk originals (go_live_at)
   * - "30 11 * * 1-5" → weekday morning RSS/ICS pull (+ go-live check)
   *
   * Test locally: wrangler dev --test-scheduled
   *   curl with ?cron= URL-encoded every-5-min expression, or the weekday pull cron
   */
  async scheduled(
    controller: ScheduledController,
    env: PullEnv,
    ctx: ExecutionContext,
  ) {
    const self = env.WORKER_SELF_REFERENCE;
    const cron = controller.cron;

    ctx.waitUntil(
      (async () => {
        // Every cron tick checks go-live so an 8:00am Detroit schedule is not
        // stranded on the weekday-only pull cron.
        await hitInternal(self, "/api/go-live", "go-live");
        if (cron === PULL_CRON) {
          await hitInternal(self, "/api/pull", "pull");
        }
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
