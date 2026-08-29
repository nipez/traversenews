/**
 * Unit checks for Desk page copy defaults + safe markdown-lite parsing.
 *   npx tsx scripts/verify-page-copy.ts
 */
import assert from "node:assert/strict";
import {
  DEFAULT_EVENTS_DEK,
  resolvePageCopy,
  validatePageCopy,
  normalizePageCopyInput,
} from "../src/lib/page-copy";
import { SafeEssayBody, SafeInlineCopy } from "../src/lib/safe-copy";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

function main() {
  const empty = resolvePageCopy(undefined);
  assert.equal(empty.events_dek, DEFAULT_EVENTS_DEK);
  assert.ok(empty.about_body.includes("## Why this exists"));

  const custom = resolvePageCopy({
    events_dek: "Hello [Civic](/civic).",
    about_title: "",
    about_dek: "Custom dek",
    about_body: "",
    updated_at: "2026-08-29T00:00:00.000Z",
  });
  assert.equal(custom.events_dek, "Hello [Civic](/civic).");
  assert.equal(custom.about_dek, "Custom dek");
  assert.ok(custom.about_title.includes("About")); // fell back

  const saved = normalizePageCopyInput({
    events_dek: "  New dek  ",
    about_title: "T",
    about_dek: "D",
    about_body: "## H\n\nP",
  });
  assert.equal(saved.events_dek, "New dek");
  assert.ok(saved.updated_at);

  assert.equal(validatePageCopy(saved), null);
  assert.ok(
    validatePageCopy({ ...saved, events_dek: "x".repeat(900) })?.includes(
      "too long",
    ),
  );

  const dekHtml = renderToStaticMarkup(
    createElement(SafeInlineCopy, {
      text: "Meetings live on [Civic](/civic). [Let us know](#event-tip)",
      linkClassName: "events-dek-link",
    }),
  );
  assert.ok(dekHtml.includes('href="/civic"'));
  assert.ok(dekHtml.includes('href="#event-tip"'));
  assert.ok(dekHtml.includes('class="events-dek-link"'));
  assert.ok(!dekHtml.includes("javascript:"));

  const bad = renderToStaticMarkup(
    createElement(SafeInlineCopy, {
      text: "Click [here](javascript:alert(1))",
    }),
  );
  assert.ok(!bad.includes("javascript:"));
  assert.ok(bad.includes("here"));

  const essay = renderToStaticMarkup(
    createElement(SafeEssayBody, {
      body: "## Why\n\nHello **world** and [Events](/events).\n\nSecond.",
    }),
  );
  assert.ok(essay.includes("<h2>Why</h2>"));
  assert.ok(essay.includes("<strong>world</strong>"));
  assert.ok(essay.includes('href="/events"'));
  assert.ok(essay.includes("<p>"));

  console.log("ok: page-copy resolve, validate, and safe-copy render");
}

main();
