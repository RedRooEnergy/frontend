import {
  migrateServicePartnerJson,
  rollbackServicePartnerMigration,
  closeMigrationDb,
  recordMigrationRun,
} from "../lib/servicePartner/migration.js";

const dryRun = process.argv.includes("--dry-run");
const rollbackIdx = process.argv.indexOf("--rollback");
const rollbackId = rollbackIdx !== -1 ? process.argv[rollbackIdx + 1] : null;

if (rollbackId) {
  const result = await rollbackServicePartnerMigration(rollbackId);
  await recordMigrationRun({
    migrationId: `rollback_${Date.now()}`,
    dryRun: false,
    mode: "ROLLBACK",
    results: result.deletions,
    rollbackOf: rollbackId,
    actorId: "cli",
    actorRole: "system",
    trigger: "cli",
  });
  console.log(`Rollback complete for ${rollbackId}`);
  for (const entry of result.deletions) {
    console.log(`${entry.collection} deleted=${entry.deleted}`);
  }
  await closeMigrationDb();
  process.exit(0);
}

const { migrationId, results } = await migrateServicePartnerJson({ dryRun });
await recordMigrationRun({
  migrationId: migrationId || `dryrun_${Date.now()}`,
  dryRun,
  mode: dryRun ? "DRY_RUN" : "MIGRATE",
  results,
  rollbackOf: null,
  actorId: "cli",
  actorRole: "system",
  trigger: "cli",
});

console.log(`Service partner migration ${dryRun ? "(dry-run)" : ""}`);
if (!dryRun) {
  console.log(`Migration ID: ${migrationId}`);
}
for (const r of results) {
  console.log(
    `${r.file} -> ${r.collection} :: ${r.status} total=${r.total} upserted=${r.upserted} modified=${r.modified} inserted=${r.inserted} missingKey=${r.missingKey}`
  );
}

await closeMigrationDb();
