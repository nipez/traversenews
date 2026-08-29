import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

/**
 * Tiny safe renderer for Desk page copy.
 * Supports: paragraphs (blank-line split), `## heading`, `[label](href)`, `**bold**`.
 * Escapes everything else as text — no raw HTML.
 */

function isSafeHref(href: string): boolean {
  const t = href.trim();
  if (!t) return false;
  if (t.startsWith("#") || t.startsWith("/")) return true;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^mailto:/i.test(t)) return true;
  return false;
}

function renderInline(
  text: string,
  keyPrefix: string,
  linkClassName?: string,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Match [label](href) or **bold** — non-greedy
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    if (m[1] != null && m[2] != null) {
      const label = m[1];
      const href = m[2].trim();
      if (isSafeHref(href)) {
        const external = /^https?:\/\//i.test(href);
        nodes.push(
          createElement(
            "a",
            {
              key: `${keyPrefix}-a-${i++}`,
              href,
              className: linkClassName,
              ...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {}),
            },
            label,
          ),
        );
      } else {
        nodes.push(label);
      }
    } else if (m[3] != null) {
      nodes.push(
        createElement("strong", { key: `${keyPrefix}-b-${i++}` }, m[3]),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function SafeInlineCopy({
  text,
  linkClassName,
}: {
  text: string;
  linkClassName?: string;
}): ReactNode {
  return createElement(
    Fragment,
    null,
    ...renderInline(text, "inline", linkClassName),
  );
}

type Block =
  | { kind: "h2"; text: string }
  | { kind: "p"; text: string };

function parseBlocks(body: string): Block[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];

  const flush = () => {
    const t = para.join("\n").trim();
    para = [];
    if (t) blocks.push({ kind: "p", text: t });
  };

  for (const line of lines) {
    const heading = /^##\s+(.+)$/.exec(line.trim());
    if (heading) {
      flush();
      blocks.push({ kind: "h2", text: heading[1].trim() });
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

/** Render About-style essay body into h2 + p nodes. */
export function SafeEssayBody({
  body,
  linkClassName,
}: {
  body: string;
  linkClassName?: string;
}): ReactNode {
  const blocks = parseBlocks(body);
  return createElement(
    Fragment,
    null,
    ...blocks.map((block, idx) => {
      if (block.kind === "h2") {
        return createElement("h2", { key: `h-${idx}` }, block.text);
      }
      return createElement(
        "p",
        { key: `p-${idx}` },
        ...renderInline(block.text, `p-${idx}`, linkClassName),
      );
    }),
  );
}
