type MemoryRow = Record<string, any>;

type MemoryCursor = {
  sort: (spec: Record<string, 1 | -1>) => {
    limit: (value: number) => {
      next: () => Promise<MemoryRow | null>;
      toArray: () => Promise<MemoryRow[]>;
    };
  };
};

type MemoryCollection = {
  createIndex: (spec: Record<string, 1 | -1>, options?: Record<string, unknown>) => Promise<unknown>;
  insertOne: (doc: Record<string, unknown>) => Promise<{ insertedId: string }>;
  findOne: (query: Record<string, unknown>) => Promise<MemoryRow | null>;
  find: (query: Record<string, unknown>) => MemoryCursor;
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => Promise<{ matchedCount: number; modifiedCount: number }>;
};

type MemoryGlobal = typeof globalThis & {
  __rreAdminMemoryCollections?: Map<string, MemoryRow[]>;
};

const globalMemory = globalThis as MemoryGlobal;
const APPEND_ONLY_COLLECTIONS = new Set(["admin_audit_logs"]);

function getStore(name: string) {
  if (!globalMemory.__rreAdminMemoryCollections) {
    globalMemory.__rreAdminMemoryCollections = new Map<string, MemoryRow[]>();
  }
  if (!globalMemory.__rreAdminMemoryCollections.has(name)) {
    globalMemory.__rreAdminMemoryCollections.set(name, []);
  }
  return globalMemory.__rreAdminMemoryCollections.get(name)!;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function matchQuery(row: MemoryRow, query: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(query || {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const candidate = value as Record<string, unknown>;
      if ("$lt" in candidate || "$lte" in candidate || "$gte" in candidate) {
        const actual = row[key];
        if ("$lt" in candidate && !(actual < candidate.$lt)) return false;
        if ("$lte" in candidate && !(actual <= candidate.$lte)) return false;
        if ("$gte" in candidate && !(actual >= candidate.$gte)) return false;
        continue;
      }
    }
    if (row[key] !== value) return false;
  }
  return true;
}

function sortRows(rows: MemoryRow[], spec: Record<string, 1 | -1>) {
  const entries = Object.entries(spec || {});
  if (entries.length === 0) return rows;
  return [...rows].sort((left, right) => {
    for (const [key, direction] of entries) {
      const l = left[key];
      const r = right[key];
      if (l === r) continue;
      if (direction === -1) return l > r ? -1 : 1;
      return l > r ? 1 : -1;
    }
    return 0;
  });
}

export function getAdminMemoryCollection(name: string): MemoryCollection {
  return {
    async createIndex() {
      return;
    },
    async insertOne(doc: Record<string, unknown>) {
      const rows = getStore(name);
      const next = clone(doc);
      const insertedId = `mem-${name}-${rows.length + 1}`;
      (next as any)._id = insertedId;
      rows.push(next);
      return { insertedId };
    },
    async findOne(query: Record<string, unknown>) {
      const rows = getStore(name);
      const row = rows.find((entry) => matchQuery(entry, query)) || null;
      return row ? clone(row) : null;
    },
    find(query: Record<string, unknown>) {
      const rows = getStore(name).filter((entry) => matchQuery(entry, query));
      return {
        sort: (spec: Record<string, 1 | -1>) => {
          const sorted = sortRows(rows, spec);
          return {
            limit: (value: number) => {
              const limited = sorted.slice(0, Math.max(0, value));
              return {
                next: async () => (limited[0] ? clone(limited[0]) : null),
                toArray: async () => clone(limited),
              };
            },
          };
        },
      };
    },
    async updateOne(filter: Record<string, unknown>, update: Record<string, unknown>) {
      if (APPEND_ONLY_COLLECTIONS.has(name)) {
        throw new Error(`${name} is append-only and cannot be updated`);
      }
      const rows = getStore(name);
      const idx = rows.findIndex((entry) => matchQuery(entry, filter));
      if (idx === -1) return { matchedCount: 0, modifiedCount: 0 };
      const next = { ...rows[idx] };
      if (update.$set && typeof update.$set === "object") {
        Object.assign(next, clone(update.$set));
      }
      rows[idx] = next;
      return { matchedCount: 1, modifiedCount: 1 };
    },
  };
}

export function listAdminMemoryCollectionRows(name: string) {
  return clone(getStore(name));
}
