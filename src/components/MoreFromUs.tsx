import Link from "next/link";
import { formatShortDate } from "@/lib/dates";
import type { Story } from "@/lib/types";

export function MoreFromUs({ stories }: { stories: Story[] }) {
  if (stories.length === 0) return null;
  return (
    <section className="anim-rise anim-delay-2">
      <h2 className="mb-5 font-serif text-[1.85rem] leading-none tracking-tight text-ink md:text-[2.1rem]">
        More stories
      </h2>
      <div className="grid gap-8 md:grid-cols-3">
        {stories.map((story) => (
          <article key={story.id}>
            {story.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={story.image_url}
                alt=""
                className="mb-3 aspect-[16/10] w-full object-cover"
              />
            ) : null}
            <h3 className="mt-2 font-serif text-xl leading-snug">
              <Link href={`/story/${story.slug}`}>{story.title}</Link>
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#444]">{story.dek}</p>
            <p className="mt-2 text-xs text-muted">
              {formatShortDate(story.published_at)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
