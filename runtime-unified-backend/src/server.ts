import { createApp } from "./app.js";

const PORT = Number(process.env.PORT || 4000);

async function main() {
  const app = createApp();

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`rre-runtime-unified-backend listening on :${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error:", err);
  process.exit(1);
});
