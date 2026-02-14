import { canonicalPayloadHash } from "./hash";
import { listWeChatBindings, listWeChatDispatches } from "./store";
import { generatePdfFromLines } from "../email/pdf";

function sortByKey<T>(rows: T[], key: (row: T) => string) {
  return [...rows].sort((left, right) => key(left).localeCompare(key(right)));
}

export async function buildWeChatGovernanceOverview(input: {
  startDate?: string;
  endDate?: string;
} = {}) {
  const bindings = await listWeChatBindings({ limit: 500 });
  const dispatches = await listWeChatDispatches({ limit: 1000 });

  const filteredDispatches = dispatches.items.filter((row) => {
    const at = Date.parse(row.createdAt);
    if (input.startDate && Number.isFinite(Date.parse(input.startDate)) && at < Date.parse(input.startDate)) return false;
    if (input.endDate && Number.isFinite(Date.parse(input.endDate)) && at > Date.parse(input.endDate)) return false;
    return true;
  });

  const statusCounts = filteredDispatches.reduce<Record<string, number>>((acc, row) => {
    const status = row.latestProviderStatus?.providerStatus || row.provider.providerStatus;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const summary = {
    generatedAt: new Date().toISOString(),
    window: {
      startDate: input.startDate || null,
      endDate: input.endDate || null,
    },
    bindingCounts: {
      total: bindings.total,
      pending: bindings.items.filter((item) => item.status === "PENDING").length,
      verified: bindings.items.filter((item) => item.status === "VERIFIED").length,
      suspended: bindings.items.filter((item) => item.status === "SUSPENDED").length,
      revoked: bindings.items.filter((item) => item.status === "REVOKED").length,
    },
    dispatchCounts: {
      total: filteredDispatches.length,
      queued: statusCounts.QUEUED || 0,
      sent: statusCounts.SENT || 0,
      delivered: statusCounts.DELIVERED || 0,
      failed: statusCounts.FAILED || 0,
    },
  };

  const records = sortByKey(
    filteredDispatches.map((row) => ({
      dispatchId: row.dispatchId,
      eventCode: row.eventCode,
      recipientBindingId: row.recipientBindingId,
      providerStatus: row.latestProviderStatus?.providerStatus || row.provider.providerStatus,
      renderedPayloadHashSha256: row.render.renderedPayloadHashSha256,
      correlation: row.correlation,
      createdAt: row.createdAt,
    })),
    (row) => `${row.createdAt}:${row.dispatchId}`
  );

  const deterministicHashSha256 = canonicalPayloadHash({
    summary,
    records,
  });

  return {
    reportVersion: "ext-wechat-01-overview.v1",
    summary,
    records,
    deterministicHashSha256,
  };
}

export async function exportWeChatAudit(input: { startDate?: string; endDate?: string } = {}) {
  const overview = await buildWeChatGovernanceOverview(input);
  const jsonString = JSON.stringify(overview, null, 2);
  const jsonHash = canonicalPayloadHash(overview);

  const lines = [
    "RRE WeChat Governance Audit Export",
    `Generated: ${new Date().toISOString()}`,
    `Dispatches: ${overview.summary.dispatchCounts.total}`,
    `Bindings: ${overview.summary.bindingCounts.total}`,
    `Deterministic hash: ${overview.deterministicHashSha256}`,
    "",
    ...overview.records.slice(0, 200).map((row) => `${row.createdAt} | ${row.dispatchId} | ${row.eventCode} | ${row.providerStatus}`),
    overview.records.length > 200 ? "... truncated ..." : "",
  ];

  const pdf = generatePdfFromLines(lines);

  const manifest = {
    generatedAt: new Date().toISOString(),
    recordCount: overview.records.length,
    deterministicHashSha256: overview.deterministicHashSha256,
    items: [
      {
        type: "JSON",
        name: "wechat_audit.json",
        sha256: jsonHash,
        bytes: Buffer.byteLength(jsonString, "utf8"),
      },
      {
        type: "PDF",
        name: "wechat_audit.pdf",
        sha256: pdf.hash,
        bytes: pdf.buffer.length,
      },
    ],
  };

  const manifestHash = canonicalPayloadHash(manifest);

  return {
    json: overview,
    jsonHash,
    pdf,
    manifest,
    manifestHash,
  };
}
