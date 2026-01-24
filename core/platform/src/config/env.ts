export type RuntimeEnv = "local" | "staging" | "prod";

export interface EnvConfig {
  env: RuntimeEnv;
  port: number;
  serviceName: string;
}

export function loadEnv(): EnvConfig {
  const env = (process.env.APP_ENV ?? "local") as RuntimeEnv;

  return {
    env,
    port: Number(process.env.PORT ?? 4000),
    serviceName: "redroo-core-platform",
  };
}
