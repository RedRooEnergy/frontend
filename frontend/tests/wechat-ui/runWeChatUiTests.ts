import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type TestResult = {
  id: string;
  pass: boolean;
  details: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "../..");

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
    await runCheck("COMPONENT-STATES", () => {
      const iconSource = readFile("components/wechat/WeChatChannelIcon.tsx");
      assert(iconSource.includes('label: "Connect WeChat"'), "NONE state label mapping missing");
      assert(iconSource.includes('label: "Pending"'), "PENDING state label mapping missing");
      assert(iconSource.includes('label: "WeChat Active"'), "VERIFIED state label mapping missing");
      assert(iconSource.includes('label: "Reconnect"'), "REVOKED state label mapping missing");
      assert(
        iconSource.includes('bindingStatus === "VERIFIED" && unreadCount > 0'),
        "VERIFIED unread badge condition missing"
      );
    })
  );

  results.push(
    await runCheck("NAV-INTERNAL-CORRELATED", () => {
      const productPage = readFile("components/ProductPageLayout.tsx");
      assert(
        productPage.includes('/dashboard/buyer/communications?${params.toString()}'),
        "Product page does not route to buyer communications"
      );
      assert(productPage.includes('params.set("supplierId"'), "Product page does not preserve supplierId correlation");
      assert(productPage.includes('params.set("productId"'), "Product page does not preserve productId correlation");

      const header = readFile("components/Header.tsx");
      assert(
        header.includes('/dashboard/buyer/communications?channel=wechat'),
        "Buyer notification-area WeChat icon link missing"
      );

      const iconSource = readFile("components/wechat/WeChatChannelIcon.tsx");
      assert(iconSource.includes("if (normalized.startsWith(\"/\")) return normalized;"), "Internal-only href guard missing");
      assert(iconSource.includes("return \"/\";"), "External href fallback to internal root missing");
    })
  );

  results.push(
    await runCheck("SCAN-PROHIBITED-PATTERNS", () => {
      const filesToScan = [
        "components/wechat/WeChatChannelIcon.tsx",
        "components/Header.tsx",
        "components/ProductPageLayout.tsx",
        "components/BuyerDashboardLayout.tsx",
        "components/AdminDashboardLayout.tsx",
        "app/dashboard/supplier/layout.tsx",
        "app/dashboard/buyer/communications/page.tsx",
      ];

      const mutationMethodPattern = /method:\s*["'`](POST|PUT|PATCH|DELETE)["'`]/i;
      const sendPattern = /\b(sendWeChatDispatch|retryFailedWeChatDispatch|startWeChatBindingFlow)\b/;
      const embedPattern = /<iframe|<webview|wechat\s*chat\s*widget|wx\.(openBusinessView|agentConfig)|webwx/i;

      for (const relPath of filesToScan) {
        const source = readFile(relPath);
        assert(!mutationMethodPattern.test(source), `Mutation HTTP method pattern found in ${relPath}`);
        assert(!sendPattern.test(source), `Direct send/retry function reference found in ${relPath}`);
        assert(!embedPattern.test(source), `Embedded chat/webview pattern found in ${relPath}`);
      }
    })
  );

  const passCount = results.filter((row) => row.pass).length;
  const failCount = results.length - passCount;

  for (const result of results) {
    process.stdout.write(`${result.pass ? "PASS" : "FAIL"} ${result.id} ${result.details}\n`);
  }

  process.stdout.write(`SUMMARY total=${results.length} pass=${passCount} fail=${failCount}\n`);
  if (failCount > 0) process.exitCode = 1;
}

main().catch((error: any) => {
  process.stderr.write(`${String(error?.message || error)}\n`);
  process.exitCode = 1;
});
