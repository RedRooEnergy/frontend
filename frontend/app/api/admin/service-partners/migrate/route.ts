import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/auth/adminGuard";
import {
  migrateServicePartnerJson,
  migrationSources,
  previewServicePartnerSources,
  rollbackServicePartnerMigration,
  recordMigrationRun,
} from "../../../../../lib/servicePartner/migration.js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const dryRun = Boolean(body?.dryRun);
  const rollback = Boolean(body?.rollback);
  const migrationId = body?.migrationId ? String(body.migrationId) : null;

  if (rollback) {
    if (!migrationId) {
      return NextResponse.json({ error: "migrationId required for rollback" }, { status: 400 });
    }
    const result = await rollbackServicePartnerMigration(migrationId);
    await recordMigrationRun({
      migrationId: `rollback_${Date.now()}`,
      dryRun: false,
      mode: "ROLLBACK",
      results: result.deletions,
      rollbackOf: migrationId,
      actorId: admin.actorId,
      actorRole: admin.actorRole,
      trigger: "manual",
    });
    return NextResponse.json({ ok: true, rollback: true, result });
  }

  const { migrationId: runId, results } = await migrateServicePartnerJson({ dryRun });
  await recordMigrationRun({
    migrationId: runId || `dryrun_${Date.now()}`,
    dryRun,
    mode: dryRun ? "DRY_RUN" : "MIGRATE",
    results,
    rollbackOf: null,
    actorId: admin.actorId,
    actorRole: admin.actorRole,
    trigger: "manual",
  });
  return NextResponse.json({ ok: true, dryRun, migrationId: runId, sources: migrationSources, results });
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = requireAdmin(request.headers);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const previews = await previewServicePartnerSources();
  return NextResponse.json({ ok: true, sources: migrationSources, previews });
}
