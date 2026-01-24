import { createEnvSnapshot } from "./env-snapshot";

createEnvSnapshot({
  env: "test",
  port: 1234,
  serviceName: "immutability-test",
});

try {
  createEnvSnapshot({
    env: "test",
    port: 5678,
    serviceName: "second-call",
  });
  console.error("ERROR: immutability not enforced");
} catch (err) {
  console.log("EXPECTED ERROR:", (err as Error).message);
}
