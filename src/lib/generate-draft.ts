import { siteWordmark } from "@/lib/sites";
import type { OriginalDraft } from "@/lib/types";

export type GenerateResult =
  | { ok: true; generated: true; body: string; model: string }
  | { ok: true; generated: false; reason: string }
  | { ok: false; error: string };

/**
 * Optional AI assist. Only runs when OPENAI_API_KEY is set.
 * Prompt forbids inventing quotes, people, crashes, or unsourced claims.
 */
export async function generateDraftBody(draft: OriginalDraft): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: true,
      generated: false,
      reason:
        "OPENAI_API_KEY is not set. Draft left for staff to write from the linked source.",
    };
  }

  const sourceBlock = [
    draft.source_title ? `Source title: ${draft.source_title}` : null,
    draft.source_dek ? `Source dek: ${draft.source_dek}` : null,
    `Source URLs:\n${draft.source_urls.map((u) => `- ${u}`).join("\n") || "(none)"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const system = `You draft short local-news articles for ${siteWordmark()}.
Hard rules:
- Use ONLY facts present in the provided source title and dek.
- Do NOT invent quotes, people, crashes, officials, organizers, or events.
- Do NOT write "organizers say" or similar attribution unless that exact claim is in the source text.
- If the source is thin, write a brief attributed rewrite and stop. Prefer short over padded.
- Plain paragraphs separated by blank lines. No markdown headings.
- End with one line: "Based on: <first source url>"`;

  const user = `Working title: ${draft.title}
Working dek: ${draft.dek}

${sourceBlock}

Write the article body now.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        error: `OpenAI error ${res.status}: ${text.slice(0, 240)}`,
      };
    }
    const json = (await res.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    const body = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!body) {
      return { ok: false, error: "Model returned an empty body." };
    }
    return {
      ok: true,
      generated: true,
      body,
      model: json.model ?? "openai",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Generate failed",
    };
  }
}
