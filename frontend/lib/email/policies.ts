export const EMAIL_POLICY = {
  productionRequiresLockedTemplates: true,
  retry: {
    maxAttempts: 3,
    baseDelayMs: 10_000,
    maxDelayMs: 5 * 60_000,
  },
  allowCcBcc: false,
  languages: {
    supported: ["EN", "ZH_CN"] as const,
    fallback: "EN" as const,
  },
} as const;
