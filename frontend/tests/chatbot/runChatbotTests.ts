import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canCreateThread, canPostMessage, canReadThread } from "../../lib/chat/policy";
import { canonicalPayloadHash } from "../../lib/chat/hash";
import { verifyChatExportDeterminism } from "../../lib/chat/ChatExportService";

type TestResult = {
  id: string;
  pass: boolean;
  details: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "../..");
const SCORECARD_PATH = path.resolve(FRONTEND_ROOT, "../scorecards/chatbot.scorecard.json");

function readFile(relPath: string) {
  return fs.readFileSync(path.join(FRONTEND_ROOT, relPath), "utf8");
}

async function runCheck(id: string, fn: () => void | Promise<void>): Promise<TestResult> {
  try {
    await fn();
    return { id, pass: true, details: "PASS" };
  } catch (error: any) {
    return { id, pass: false, details: String(error?.message || error) };
  }
}

async function main() {
  const results: TestResult[] = [];

  results.push(
    await runCheck("POLICY-MATRIX", () => {
      const buyer = { actorId: "buyer-1", actorEmail: "buyer1@example.com", actorRole: "BUYER" as const };
      const supplier = { actorId: "supplier-1", actorEmail: "supplier1@example.com", actorRole: "SUPPLIER" as const };
      const admin = { actorId: "admin-1", actorEmail: "admin@example.com", actorRole: "ADMIN" as const };

      assert.equal(
        canCreateThread(buyer, "ORDER", {
          relatedEntityType: "ORDER",
          relatedEntityId: "ORD-1",
          ownerBuyerEmail: "buyer1@example.com",
        }),
        true
      );
      assert.equal(
        canCreateThread(buyer, "ORDER", {
          relatedEntityType: "ORDER",
          relatedEntityId: "ORD-1",
          ownerBuyerEmail: "other@example.com",
        }),
        false
      );
      assert.equal(
        canCreateThread(supplier, "PRODUCT_INQUIRY", {
          relatedEntityType: "PRODUCT",
          relatedEntityId: "product-1",
          supplierId: "supplier-1",
        }),
        true
      );
      assert.equal(
        canCreateThread(supplier, "PRODUCT_INQUIRY", {
          relatedEntityType: "PRODUCT",
          relatedEntityId: "product-1",
          supplierId: "supplier-2",
        }),
        false
      );
      assert.equal(
        canCreateThread(admin, "ADMIN", {
          relatedEntityType: "NONE",
          relatedEntityId: null,
        }),
        true
      );
    })
  );

  results.push(
    await runCheck("RBAC-NON-PARTICIPANT", () => {
      const thread = {
        threadId: "thread-1",
        type: "ORDER",
        relatedEntityType: "ORDER",
        relatedEntityId: "ORD-1",
        participants: [{ userId: "buyer-1", role: "BUYER" }],
        status: "OPEN",
        caseId: null,
        tenantId: null,
        threadHash: "x",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        closedAt: null,
        lockedAt: null,
        lockedBy: null,
      } as any;

      const outsider = { actorId: "supplier-1", actorEmail: "supplier@example.com", actorRole: "SUPPLIER" as const };
      assert.equal(canReadThread(outsider, thread), false);
    })
  );

  results.push(
    await runCheck("LOCKED-POST-BLOCK", () => {
      const thread = {
        threadId: "thread-1",
        participants: [{ userId: "buyer-1", role: "BUYER" }],
        status: "LOCKED",
      } as any;
      const buyer = { actorId: "buyer-1", actorEmail: "buyer1@example.com", actorRole: "BUYER" as const };
      assert.equal(canPostMessage(buyer, thread), false);
    })
  );

  results.push(
    await runCheck("HASH-CANONICALIZATION", () => {
      const first = canonicalPayloadHash({ b: 2, a: 1, nested: { z: 1, y: 2 } });
      const second = canonicalPayloadHash({ nested: { y: 2, z: 1 }, a: 1, b: 2 });
      const third = canonicalPayloadHash({ nested: { y: 9, z: 1 }, a: 1, b: 2 });
      assert.equal(first, second, "Canonical hash should match for equivalent object ordering");
      assert.notEqual(first, third, "Canonical hash should differ for value changes");
    })
  );

  results.push(
    await runCheck("EXPORT-DETERMINISM", () => {
      const determinism = verifyChatExportDeterminism({
        thread: {
          threadId: "thread-1",
          type: "ORDER",
          relatedEntityType: "ORDER",
          relatedEntityId: "ORD-1",
          participants: [{ userId: "buyer-1", role: "BUYER" }],
          status: "OPEN",
          caseId: null,
          tenantId: null,
          threadHash: "thash",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          closedAt: null,
          lockedAt: null,
          lockedBy: null,
        },
        messages: [
          {
            messageId: "msg-1",
            threadId: "thread-1",
            senderId: "buyer-1",
            senderRole: "BUYER",
            body: "Need order update",
            attachments: [],
            systemEvent: false,
            systemEventType: null,
            createdAt: "2026-01-01T00:01:00.000Z",
            messageHash: "mhash",
            moderationFlags: [],
          },
        ],
        redactions: [],
      });

      assert.equal(determinism.sameJsonHash, true);
      assert.equal(determinism.sameManifestHash, true);
      assert.equal(determinism.samePdfHash, true);
    })
  );

  results.push(
    await runCheck("AUDIT-WRITER-HOOKS", () => {
      const source = readFile("lib/chat/ChatService.ts");
      const requiredEvents = [
        'eventType: "THREAD_CREATED"',
        'eventType: "MESSAGE_POSTED"',
        'eventType: "THREAD_ESCALATED"',
        'eventType: "THREAD_LOCKED"',
        'eventType: "MESSAGE_REDACTED"',
        'eventType: "THREAD_EXPORTED"',
      ];
      for (const marker of requiredEvents) {
        assert(source.includes(marker), `Missing audit event hook in ChatService: ${marker}`);
      }
    })
  );

  results.push(
    await runCheck("RATE-LIMIT-HOOK", () => {
      const source = readFile("lib/chat/ChatService.ts");
      assert(source.includes("checkChatSendRateLimit"), "Message send rate-limit hook missing");
      assert(source.includes("CHAT_RATE_LIMITED"), "Rate-limit error path missing");
    })
  );

  results.push(
    await runCheck("ROUTE-GUARDS", () => {
      const routePaths = [
        "app/api/chat/threads/route.ts",
        "app/api/chat/threads/[threadId]/messages/route.ts",
        "app/api/chat/threads/[threadId]/escalate/route.ts",
        "app/api/chat/threads/[threadId]/lock/route.ts",
        "app/api/chat/threads/[threadId]/redact/route.ts",
        "app/api/chat/attachments/route.ts",
        "app/api/chat/attachments/upload/route.ts",
      ];

      for (const relPath of routePaths) {
        const source = readFile(relPath);
        assert(source.includes("requireAuthenticatedChatActor"), `Auth guard missing in ${relPath}`);
        assert(source.includes("ensureChatMutationOrigin"), `Origin guard missing in ${relPath}`);
      }
    })
  );

  results.push(
    await runCheck("UI-SMOKE", () => {
      const buyerPage = readFile("app/dashboard/buyer/messages/page.tsx");
      const supplierPage = readFile("app/dashboard/supplier/messages/page.tsx");
      const adminPage = readFile("app/dashboard/admin/conversations/page.tsx");

      assert(buyerPage.includes("ChatDashboardClient"), "Buyer messages page is not wired to chat dashboard");
      assert(supplierPage.includes("ChatDashboardClient"), "Supplier messages page is not wired to chat dashboard");
      assert(adminPage.includes("ChatDashboardClient"), "Admin conversations page is not wired to chat dashboard");
    })
  );

  results.push(
    await runCheck("PROHIBITED-PATTERNS", () => {
      const filesToScan = [
        "lib/chat/ChatService.ts",
        "lib/chat/policy.ts",
        "app/api/chat/threads/route.ts",
        "components/chat/ChatDashboardClient.tsx",
        "components/chat/ChatWindow.tsx",
      ];

      const forbiddenPatterns = [/whatsapp/i, /wechat\s*chat\s*widget/i, /wx\./i, /<iframe/i];
      for (const relPath of filesToScan) {
        const source = readFile(relPath);
        for (const pattern of forbiddenPatterns) {
          assert(!pattern.test(source), `Forbidden external chat/platform pattern in ${relPath}: ${pattern}`);
        }
      }
    })
  );

  const passCount = results.filter((row) => row.pass).length;
  const failCount = results.length - passCount;

  for (const row of results) {
    process.stdout.write(`${row.pass ? "PASS" : "FAIL"} ${row.id} ${row.details}\n`);
  }
  process.stdout.write(`SUMMARY total=${results.length} pass=${passCount} fail=${failCount}\n`);

  const scorecard = {
    extensionId: "EXT-CHAT-01",
    generatedAt: new Date().toISOString(),
    overall: failCount === 0 ? "PASS" : "FAIL",
    totalChecks: results.length,
    passCount,
    failCount,
    checks: results.map((row) => ({
      id: row.id,
      status: row.pass ? "PASS" : "FAIL",
      details: row.details,
    })),
  };

  fs.mkdirSync(path.dirname(SCORECARD_PATH), { recursive: true });
  fs.writeFileSync(SCORECARD_PATH, `${JSON.stringify(scorecard, null, 2)}\n`, "utf8");

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

void main();
