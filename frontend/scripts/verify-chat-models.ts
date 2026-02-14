import { createThread, getThreadDetail, listThreads, postMessage } from "../lib/chat/ChatService";

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  const actor = {
    actorId: "chat-model-verifier",
    actorEmail: "chat-model-verifier@local",
    actorRole: "ADMIN" as const,
  };

  const thread = await createThread({
    actor,
    payload: {
      type: "ADMIN",
      relatedEntityType: "NONE",
      relatedEntityId: null,
      participants: [{ userId: actor.actorId, role: "ADMIN" }],
    },
  });

  await postMessage({
    actor,
    threadId: thread.threadId,
    payload: {
      body: "verify-chat-models sanity message",
      attachments: [],
      clientMessageId: "sanity-1",
    },
  });

  const detail = await getThreadDetail({
    actor,
    threadId: thread.threadId,
    limit: 20,
  });

  const threads = await listThreads({
    actor,
    status: "ALL",
    limit: 20,
  });

  const inList = threads.some((entry) => entry.threadId === thread.threadId);

  process.stdout.write(
    JSON.stringify(
      {
        threadId: thread.threadId,
        messageCount: detail.messages.length,
        threadListed: inList,
      },
      null,
      2
    ) + "\n"
  );
}

main().catch((error: any) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
