import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), ".open-next");
const file = join(dir, "worker.js");
mkdirSync(dir, { recursive: true });
if (!existsSync(file)) {
  writeFileSync(
    file,
    `export default { async fetch() { return new Response("open-next stub"); } };
export class DOQueueHandler {}
export class DOShardedTagCache {}
export class BucketCachePurge {}
`,
  );
}
