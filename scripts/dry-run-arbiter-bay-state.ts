/**
 * Live dry-run: ArbiterLive TC core + Bay GraphQL (+ State if not Incapsula).
 * Does not write KV. Never invents rows.
 *
 *   npx tsx scripts/dry-run-arbiter-bay-state.ts
 */
import {
  ARBITERLIVE_MISSING_SCHOOLS,
  ARBITERLIVE_SCHOOL_IDS,
  pullArbiterLiveAthletics,
} from "../src/lib/pull/arbiterlive";
import { pullBayTheatreShows } from "../src/lib/pull/bay-theatre";
import { pullHtmlShows } from "../src/lib/pull/html-shows";
import { selectNextWeekAthletics, selectThisWeekAthletics } from "../src/lib/athletics";
import type { Source } from "../src/lib/types";

const now = new Date();

function src(
  id: string,
  name: string,
  url: string,
  beat: string,
): Source {
  return {
    id,
    name,
    homepage: url,
    feed_url: url,
    pull_method: "html",
    beat_id: beat,
    enabled: true,
    notes: "",
  };
}

async function main() {
  const core = [
    src("src_tcc_ath", "TC Central", "https://arbiterlive.com/School/Calendar/23592", "beat_hs_sports"),
    src("src_tcw_ath", "TC West", "https://arbiterlive.com/School/Calendar/23596", "beat_hs_sports"),
    src("src_tcsf_ath", "St. Francis", "https://arbiterlive.com/School/Calendar/37891", "beat_hs_sports"),
    src("src_tcch_ath", "TC Christian", "https://arbiterlive.com/School/Calendar/23593", "beat_hs_sports"),
  ];

  const allGames = [];
  for (const source of core) {
    const result = await pullArbiterLiveAthletics(source, now);
    console.log(
      `${source.name}: games=${result.games.length} blocked=${result.bot_blocked} status=${result.status} err=${result.error ?? ""}`,
    );
    if (result.games[0]) {
      console.log(`  first: ${result.games[0].starts_at} ${result.games[0].title}`);
    }
    allGames.push(...result.games);
  }

  const week = selectThisWeekAthletics(allGames, now);
  const next = selectNextWeekAthletics(allGames, now);
  console.log(`TC core This week=${week.length} Next week=${next.length}`);

  const bay = await pullBayTheatreShows(
    src("src_bay_theatre", "Bay Theatre", "https://thebaytheatre.org/graphql", "beat_shows"),
    now,
  );
  console.log(
    `Bay: shows=${bay.shows.length} blocked=${bay.bot_blocked} status=${bay.status} err=${bay.error ?? ""}`,
  );
  for (const s of bay.shows.slice(0, 5)) {
    console.log(`  ${s.starts_at.slice(0, 10)} ${s.title} [${s.times.join(", ")}]`);
  }

  const state = await pullHtmlShows(
    src(
      "src_state_theatre",
      "State Theatre",
      "https://secure.traversecityfilmfest.org/websales/pages/list.aspx?epguid=f9385ae5-a20d-40bd-8812-c04853a2e0fb&",
      "beat_shows",
    ),
  );
  console.log(
    `State: shows=${state.shows.length} blocked=${state.bot_blocked} status=${state.status} err=${state.error ?? ""}`,
  );
  for (const s of state.shows.slice(0, 5)) {
    console.log(`  ${s.starts_at.slice(0, 10)} ${s.title} [${s.times.join(", ")}]`);
  }

  console.log("ArbiterLive school ids:", ARBITERLIVE_SCHOOL_IDS);
  console.log("Missing schools:", ARBITERLIVE_MISSING_SCHOOLS);

  if (week.length === 0) {
    console.error("FAIL: TC core This week empty");
    process.exit(1);
  }
  if (bay.shows.length === 0 && !bay.bot_blocked) {
    console.error("FAIL: Bay returned 0 rows without bot block");
    process.exit(1);
  }
  console.log("ok — dry-run arbiter/bay/state");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
