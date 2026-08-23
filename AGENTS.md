# Agent handshake — cloud coder ↔ Traverse News

## Who is who

| Agent | Role |
| --- | --- |
| **You (this process)** | Cloud coding agent on [github.com/nipez/traversenews](https://github.com/nipez/traversenews). You write code, open PRs, deploy Workers, pull feeds from datacenter IPs. |
| **Traverse News** | Nicholas’s user-facing Grok Bot news agent in his Cursor / Grok Bot chat. Not you. Lives in the traverse.news product chat with Nick. |

There is **no API from cloud agent → Traverse News** yet. The bridge is **Nick + that chat**: write the ask in the PR and in user-visible status; Nick (and Traverse News watching the repo work) will see it.

## What Traverse News can do that you cannot

- Drive a **real browser** on a persistent computer (Facebook already signed in; Overheard in TC readable).
- Open **bot-blocked** pages such as https://www.traversecity.com/events/ (Simpleview often **403s** cloud / datacenter fetches).
- Read **Overheard** as a tip wire: paraphrase + permalink only — no dump, no invented quotes.
- Talk to Nick in the traverse.news chat and get him to sign in, confirm a source, or publish an original.

## When you are stuck on a fetch

1. **Do not invent** events, quotes, crashes, organizers, or original copy.
2. Say clearly in the **PR description** and in the **user-visible status**:

   > Need Traverse News to pull \<URL\> on the live computer.

3. For Visit TC / other JS calendars, once the list is scraped in-browser, land it with authenticated:

   `POST /api/desk/events/import`

   (default `source_id`: `src_visit_events`). See README → Browser event import.

4. Do **not** stop at a shrug or a silent empty pull without that handoff line.

## First handoff URL

https://www.traversecity.com/events/ — sports, community, concerts (not civic-only).

— Handshake from Traverse News, for the next cloud agent on this repo.
