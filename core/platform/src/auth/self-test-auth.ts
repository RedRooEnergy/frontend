import { authorize } from "./authorize";

try {
  authorize("/any", "TEST-REQUEST-ID");
  console.error("ERROR: authorization should have denied by default");
} catch (err) {
  console.log("EXPECTED ERROR:", (err as Error).message);
}
