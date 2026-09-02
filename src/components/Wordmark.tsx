import { getSite, siteWordmark } from "@/lib/sites";

export function Wordmark({
  className = "",
  tone = "ink",
}: {
  className?: string;
  tone?: "ink" | "cream";
}) {
  const site = getSite();
  const cls = tone === "cream" ? "wordmark-cream" : "wordmark-ink";
  return (
    <span className={`wordmark ${cls} ${className}`.trim()}>
      {site.wordmarkPrimary}
      <span className="wordmark-dot">.</span>
      {site.wordmarkTld}
    </span>
  );
}

export function wordmarkText(): string {
  return siteWordmark();
}
