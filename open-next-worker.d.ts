declare module "./.open-next/worker.js" {
  const handler: {
    fetch: (
      request: Request,
      env: unknown,
      ctx: ExecutionContext,
    ) => Promise<Response> | Response;
  };
  export default handler;
  export const DOQueueHandler: unknown;
  export const DOShardedTagCache: unknown;
  export const BucketCachePurge: unknown;
}

declare module ".open-next/worker.js" {
  const handler: {
    fetch: (
      request: Request,
      env: unknown,
      ctx: ExecutionContext,
    ) => Promise<Response> | Response;
  };
  export default handler;
  export const DOQueueHandler: unknown;
  export const DOShardedTagCache: unknown;
  export const BucketCachePurge: unknown;
}
