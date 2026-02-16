export type MigrationSchedule = {
  enabled?: boolean;
  intervalHours?: number;
  lastRunAt?: string | null;
  lastResult?: { migrationId?: string; dryRun?: boolean } | null;
  updatedBy?: string | null;
};

export function getMigrationSchedule(): Promise<MigrationSchedule>;

export function setMigrationSchedule(args?: {
  enabled?: boolean;
  intervalHours?: number;
  updatedBy?: string | null;
}): Promise<MigrationSchedule>;

export function updateMigrationScheduleRun(args?: {
  lastRunAt?: string | null;
  lastResult?: { migrationId?: string; dryRun?: boolean } | null;
}): Promise<MigrationSchedule>;

export function migrateServicePartnerJson(args?: { dryRun?: boolean; migrationId?: string | null }): Promise<{
  migrationId: string;
  results: Array<Record<string, unknown>>;
}>;

export const migrationSources: Array<{ file: string; collection: string }>;

export function previewServicePartnerSources(): Promise<
  Array<{
    file: string;
    collection: string;
    exists: boolean;
    count: number;
    sizeBytes: number | null;
    modifiedAt: string | null;
  }>
>;

export function rollbackServicePartnerMigration(migrationId: string): Promise<{
  migrationId: string;
  deletions: Array<{ collection: string; deleted: number }>;
}>;

export function recordMigrationRun(args: {
  migrationId: string;
  dryRun: boolean;
  mode: string;
  results: Array<Record<string, unknown>>;
  rollbackOf?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  trigger?: string;
}): Promise<Record<string, unknown>>;

export function getMigrationRunHistory(args?: { limit?: number }): Promise<Array<Record<string, unknown>>>;
