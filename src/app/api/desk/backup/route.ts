import { NextResponse } from "next/server";
import { isDeskRequestAuthed } from "@/lib/auth";
import { getTraverseDataKv } from "@/lib/data/kv";
import {
  getTraverseBackupsR2,
  snapshotAppDataToBackups,
} from "@/lib/data/kv-backup";

/**
 * On-demand KV `app_data` → private R2 `traverse-news-backups` snapshot.
 * Same write as the 2am Worker cron (`kv/YYYY-MM-DD/app_data.json` + `kv/latest.json`).
 *
 * Auth: Desk cookie OR Authorization: Bearer <DESK_IMPORT_TOKEN|DEV_DESK_PASSWORD>
 * Response: { ok, date, bytes } only — never the JSON body or subscriber emails.
 */
export async function POST(request: Request) {
  if (!(await isDeskRequestAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await snapshotAppDataToBackups({
    kv: await getTraverseDataKv(),
    r2: await getTraverseBackupsR2(),
  });

  if (!result.ok) {
    const status = result.reason === "missing_binding" ? 503 : 404;
    return NextResponse.json(
      { ok: false, date: result.date, error: result.reason },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    date: result.date,
    bytes: result.bytes,
  });
}
