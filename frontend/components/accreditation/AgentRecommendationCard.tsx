"use client";

import { AccreditationAgent } from "../../data/accreditationAgents";

export default function AgentRecommendationCard({
  agent,
  reason,
  locale,
}: {
  agent: AccreditationAgent;
  reason: { en: string; zh: string };
  locale: "en" | "zh-CN";
}) {
  const summary = locale === "zh-CN" ? agent.summary.zh : agent.summary.en;
  const reasonText = locale === "zh-CN" ? reason.zh : reason.en;

  return (
    <div className="border rounded-xl p-4 bg-surface shadow-sm space-y-2">
      <div className="text-sm font-semibold text-strong">{agent.name}</div>
      <div className="text-xs text-muted">{summary}</div>
      <div className="text-xs text-amber-700">{reasonText}</div>
      <a
        href={agent.websiteUrl}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-semibold text-brand-700 underline"
      >
        {locale === "zh-CN" ? "打开网站" : "Open website"}
      </a>
    </div>
  );
}
