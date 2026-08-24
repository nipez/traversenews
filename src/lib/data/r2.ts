import type { SectionHeaderId } from "@/lib/types";
import { r2ObjectKey } from "@/lib/section-headers";

type R2Like = {
  get(key: string): Promise<{
    body: ReadableStream | null;
    httpMetadata?: { contentType?: string };
    writeHttpMetadata?: (headers: Headers) => void;
    arrayBuffer: () => Promise<ArrayBuffer>;
  } | null>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | ReadableStream | Blob,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
};

export async function getTraverseMediaR2(): Promise<R2Like | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const r2 = (ctx.env as CloudflareEnv | undefined)?.TRAVERSE_MEDIA;
    if (
      r2 &&
      typeof (r2 as R2Like).get === "function" &&
      typeof (r2 as R2Like).put === "function"
    ) {
      return r2 as R2Like;
    }
  } catch {
    // Plain next dev without Cloudflare context, or missing binding.
  }
  return null;
}

export async function putSectionHeaderObject(args: {
  id: SectionHeaderId;
  bytes: ArrayBuffer;
  contentType: string;
}): Promise<boolean> {
  const r2 = await getTraverseMediaR2();
  if (!r2) return false;
  await r2.put(r2ObjectKey(args.id), args.bytes, {
    httpMetadata: { contentType: args.contentType },
  });
  return true;
}

export async function deleteSectionHeaderObject(
  id: SectionHeaderId,
): Promise<void> {
  const r2 = await getTraverseMediaR2();
  if (!r2) return;
  try {
    await r2.delete(r2ObjectKey(id));
  } catch {
    // Object may not exist.
  }
}

export async function getSectionHeaderObject(id: SectionHeaderId) {
  const r2 = await getTraverseMediaR2();
  if (!r2) return null;
  return r2.get(r2ObjectKey(id));
}
