export type EnvSnapshot = Readonly<{
  env: string;
  port: number;
  serviceName: string;
}>;

let snapshot: EnvSnapshot | null = null;

export function createEnvSnapshot(input: {
  env: string;
  port: number;
  serviceName: string;
}): EnvSnapshot {
  if (snapshot) {
    throw new Error("[CORE] Env snapshot already created (immutability enforced)");
  }

  snapshot = Object.freeze({
    env: input.env,
    port: input.port,
    serviceName: input.serviceName,
  });

  return snapshot;
}

export function getEnvSnapshot(): EnvSnapshot {
  if (!snapshot) {
    throw new Error("[CORE] Env snapshot not initialised");
  }
  return snapshot;
}
