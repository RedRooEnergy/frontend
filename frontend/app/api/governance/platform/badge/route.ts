import { getPlatformGovernanceStatus, renderGovernanceBadge } from "../_lib";

export const dynamic = "force-dynamic";

function computeBadgeState(status: ReturnType<typeof getPlatformGovernanceStatus>) {
  if (status.badgeState === "DEGRADED") return { text: "DEGRADED", color: "#e05d44" };
  if (status.badgeState === "NO_DATA") return { text: "NO_DATA", color: "#9f9f9f" };
  if (status.badgeState === "REGRESSION") return { text: "REGRESSION", color: "#e05d44" };
  if (status.badgeState === "IMPROVING") return { text: "IMPROVING", color: "#007ec6" };
  return { text: "PASS", color: "#4c1" };
}

export async function GET() {
  const status = getPlatformGovernanceStatus();
  const state = computeBadgeState(status);
  const svg = renderGovernanceBadge("platform-governance", state.text, state.color);

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
    },
  });
}
