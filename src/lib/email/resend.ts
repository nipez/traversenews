/** Resend sending helpers. Key from Worker secret RESEND_API_KEY only. */

export const LETTER_FROM = "Traverse News <letter@traverse.news>";
export const DEFAULT_TEST_RECIPIENT = "nickperez@gmail.com";

/** Resend batch endpoint accepts up to 100; keep smaller for Worker CPU/time. */
const BATCH_SIZE = 25;

export type ResendSendResult = {
  id?: string;
  to: string;
  ok: boolean;
  error?: string;
};

export function getResendApiKey(): string | null {
  const fromEnv = process.env.RESEND_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  return null;
}

export async function getResendApiKeyAsync(): Promise<string | null> {
  const sync = getResendApiKey();
  if (sync) return sync;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const key = (ctx.env as CloudflareEnv | undefined)?.RESEND_API_KEY;
    if (typeof key === "string" && key.trim()) return key.trim();
  } catch {
    // next dev without Worker bindings
  }
  return null;
}

export function isResendConfiguredSync(): boolean {
  return Boolean(getResendApiKey());
}

export async function isResendConfigured(): Promise<boolean> {
  return Boolean(await getResendApiKeyAsync());
}

type ResendPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
};

async function postResendBatch(
  apiKey: string,
  payloads: ResendPayload[],
): Promise<ResendSendResult[]> {
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payloads),
  });

  const raw = (await res.json().catch(() => null)) as
    | { data?: Array<{ id: string }>; error?: { message?: string } }
    | Array<{ id: string }>
    | null;

  if (!res.ok) {
    const message =
      raw && !Array.isArray(raw) && raw.error?.message
        ? raw.error.message
        : `Resend batch HTTP ${res.status}`;
    return payloads.map((p) => ({
      to: p.to[0] ?? "",
      ok: false,
      error: message,
    }));
  }

  const ids = Array.isArray(raw)
    ? raw.map((r) => r.id)
    : (raw?.data ?? []).map((r) => r.id);

  return payloads.map((p, i) => ({
    to: p.to[0] ?? "",
    ok: true,
    id: ids[i],
  }));
}

/**
 * Send the same HTML to many addresses via Resend batch API.
 * Builds no letter content — caller supplies subject/html once.
 */
export async function sendLetterToRecipients(opts: {
  apiKey: string;
  recipients: string[];
  subject: string;
  html: string;
  text: string;
  listUnsubscribeUrl: string;
}): Promise<{ sent: ResendSendResult[]; failed: ResendSendResult[] }> {
  const unique = [
    ...new Set(
      opts.recipients
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
    ),
  ];

  const sent: ResendSendResult[] = [];
  const failed: ResendSendResult[] = [];

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const chunk = unique.slice(i, i + BATCH_SIZE);
    const payloads: ResendPayload[] = chunk.map((to) => ({
      from: LETTER_FROM,
      to: [to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      headers: {
        // No one-click unsub route yet — link to signup/manage on the letter page.
        "List-Unsubscribe": `<${opts.listUnsubscribeUrl}>`,
      },
    }));

    const results = await postResendBatch(opts.apiKey, payloads);
    for (const r of results) {
      if (r.ok) sent.push(r);
      else failed.push(r);
    }
  }

  return { sent, failed };
}
