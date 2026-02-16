export type ComplianceFlag = "CEC" | "RCM" | "EESS" | "GEMS" | "UNVERIFIED";

export const complianceFlags: { code: ComplianceFlag; label: string; description: string }[] = [
  { code: "CEC", label: "CEC", description: "Clean Energy Council aligned evidence provided." },
  { code: "RCM", label: "RCM", description: "Regulatory Compliance Mark declaration supplied." },
  { code: "EESS", label: "EESS", description: "Electrical Equipment Safety Scheme documentation present." },
  { code: "GEMS", label: "GEMS", description: "Greenhouse and Energy Minimum Standards evidence provided." },
  { code: "UNVERIFIED", label: "Unverified", description: "Compliance evidence not yet verified." },
];
