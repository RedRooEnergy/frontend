import { assertSha256LowerHex64 } from "./hashValidation";

type CanonicalLaneInput = {
  originCountry: string;
  originPort?: string | null;
  destinationCountry: string;
  destinationPort?: string | null;
};

type CanonicalComplianceInput = {
  certificateIssued: boolean;
  certificateId?: string | null;
  certificateHash?: string | null;
};

export type CanonicalSettlementInput = {
  schemaVersion: "FREIGHT_SETTLEMENT_CANONICAL_V1";
  orderId: string;
  paymentSnapshotHash: string;
  exportManifestHash: string;
  currency: "AUD";
  subtotalAUD: number;
  shippingAUD: number;
  insuranceAUD: number;
  dutyAUD: number;
  gstAUD: number;
  totalAUD: number;
  incoterm: "DDP";
  carrierId: string;
  shipmentId: string;
  trackingNumbers: string[];
  lane: CanonicalLaneInput;
  compliance: CanonicalComplianceInput;
  settlementStatus: "FINAL";
  finalizedAt: string;
};

function normalizeRequiredString(value: unknown, field: string) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`CANONICAL_SETTLEMENT_INVALID_${field.toUpperCase()}`);
  }
  return normalized;
}

function normalizeOptionalString(value: unknown) {
  const normalized = String(value || "").trim();
  return normalized ? normalized : null;
}

function normalizeInteger(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`CANONICAL_SETTLEMENT_INVALID_INTEGER_${field.toUpperCase()}`);
  }
  return value;
}

function normalizeUtcIso(value: unknown, field: string) {
  const normalized = normalizeRequiredString(value, field);
  if (!normalized.endsWith("Z") || !Number.isFinite(Date.parse(normalized))) {
    throw new Error(`CANONICAL_SETTLEMENT_INVALID_UTC_${field.toUpperCase()}`);
  }
  return normalized;
}

function normalizeTrackingNumbers(values: unknown) {
  if (!Array.isArray(values)) {
    throw new Error("CANONICAL_SETTLEMENT_INVALID_TRACKING_NUMBERS");
  }

  return values
    .map((value) => normalizeRequiredString(value, "trackingNumber"))
    .sort((left, right) => left.localeCompare(right));
}

function normalizeCompliance(input: CanonicalComplianceInput) {
  if (typeof input?.certificateIssued !== "boolean") {
    throw new Error("CANONICAL_SETTLEMENT_INVALID_COMPLIANCE_CERTIFICATE_ISSUED");
  }

  const output: {
    certificateIssued: boolean;
    certificateId?: string;
    certificateHash?: string;
  } = {
    certificateIssued: input.certificateIssued,
  };

  const certificateId = normalizeOptionalString(input.certificateId);
  const certificateHash = normalizeOptionalString(input.certificateHash);

  if (certificateId) {
    output.certificateId = certificateId;
  }
  if (certificateHash) {
    output.certificateHash = assertSha256LowerHex64(certificateHash, "certificateHash");
  }

  return output;
}

function normalizeLane(input: CanonicalLaneInput) {
  const originCountry = normalizeRequiredString(input?.originCountry, "originCountry");
  const destinationCountry = normalizeRequiredString(input?.destinationCountry, "destinationCountry");
  const originPort = normalizeOptionalString(input?.originPort);
  const destinationPort = normalizeOptionalString(input?.destinationPort);

  const output: {
    originCountry: string;
    originPort?: string;
    destinationCountry: string;
    destinationPort?: string;
  } = {
    originCountry,
    destinationCountry,
  };

  if (originPort) output.originPort = originPort;
  if (destinationPort) output.destinationPort = destinationPort;

  return output;
}

function serializeCanonicalNumber(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error("CANONICAL_SETTLEMENT_INVALID_NUMBER_NON_FINITE");
  }
  if (!Number.isInteger(value)) {
    throw new Error("CANONICAL_SETTLEMENT_INVALID_NUMBER_NON_INTEGER");
  }

  const normalized = Object.is(value, -0) ? "0" : String(value);
  if (/[eE]/.test(normalized)) {
    throw new Error("CANONICAL_SETTLEMENT_INVALID_NUMBER_SCIENTIFIC_NOTATION");
  }

  return normalized;
}

function stableStringifyInternal(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return serializeCanonicalNumber(value);
  if (typeof value === "string") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringifyInternal(entry)).join(",")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined);
    const sorted = entries.sort(([left], [right]) => left.localeCompare(right));
    return `{${sorted
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringifyInternal(entry)}`)
      .join(",")}}`;
  }

  throw new Error(`CANONICAL_SETTLEMENT_UNSUPPORTED_VALUE_TYPE:${typeof value}`);
}

export function stableStringify(value: unknown) {
  return stableStringifyInternal(value);
}

export function canonicalizeSettlementPayload(input: CanonicalSettlementInput): string {
  if (input?.schemaVersion !== "FREIGHT_SETTLEMENT_CANONICAL_V1") {
    throw new Error("CANONICAL_SETTLEMENT_INVALID_SCHEMA_VERSION");
  }

  if (input.currency !== "AUD") {
    throw new Error("CANONICAL_SETTLEMENT_INVALID_CURRENCY");
  }

  if (input.incoterm !== "DDP") {
    throw new Error("CANONICAL_SETTLEMENT_INVALID_INCOTERM");
  }

  if (input.settlementStatus !== "FINAL") {
    throw new Error("CANONICAL_SETTLEMENT_INVALID_SETTLEMENT_STATUS");
  }

  const canonicalPayload = {
    schemaVersion: "FREIGHT_SETTLEMENT_CANONICAL_V1",
    orderId: normalizeRequiredString(input.orderId, "orderId"),
    paymentSnapshotHash: assertSha256LowerHex64(input.paymentSnapshotHash, "paymentSnapshotHash"),
    exportManifestHash: assertSha256LowerHex64(input.exportManifestHash, "exportManifestHash"),
    currency: "AUD",
    subtotalAUD: normalizeInteger(input.subtotalAUD, "subtotalAUD"),
    shippingAUD: normalizeInteger(input.shippingAUD, "shippingAUD"),
    insuranceAUD: normalizeInteger(input.insuranceAUD, "insuranceAUD"),
    dutyAUD: normalizeInteger(input.dutyAUD, "dutyAUD"),
    gstAUD: normalizeInteger(input.gstAUD, "gstAUD"),
    totalAUD: normalizeInteger(input.totalAUD, "totalAUD"),
    incoterm: "DDP",
    carrierId: normalizeRequiredString(input.carrierId, "carrierId"),
    shipmentId: normalizeRequiredString(input.shipmentId, "shipmentId"),
    trackingNumbers: normalizeTrackingNumbers(input.trackingNumbers),
    lane: normalizeLane(input.lane),
    compliance: normalizeCompliance(input.compliance),
    settlementStatus: "FINAL",
    finalizedAt: normalizeUtcIso(input.finalizedAt, "finalizedAt"),
  };

  return stableStringify(canonicalPayload);
}
