import type { ChecklistDefinition } from "../lib/compliance/types";

const today = new Date().toISOString().slice(0, 10);

export const complianceChecklistSeed: ChecklistDefinition[] = [
  {
    checklistId: "CHK-INVERTER-BATTERY-EV",
    productType: "InverterBatteryEV",
    title: "Inverters / Batteries / EV Chargers – Compliance Checklist",
    status: "ACTIVE",
    version: "1.0.0",
    effectiveFrom: today,
    items: [
      { itemId: "TEST_REPORT", label: "Accredited Test Report(s) (IEC/CB/ILAC)", required: true, docTypes: ["TEST_REPORT"] },
      { itemId: "BOM", label: "Bill of Materials (BOM)", required: true, docTypes: ["BOM"] },
      { itemId: "SCHEMATICS", label: "Electrical schematics", required: true, docTypes: ["SCHEMATICS"] },
      { itemId: "MANUAL_EN", label: "User manual (English)", required: true, docTypes: ["MANUAL_EN"] },
      { itemId: "LABEL_RCM", label: "Label artwork (RCM-ready)", required: true, docTypes: ["LABEL_RCM"] },
    ],
  },
  {
    checklistId: "CHK-SOLAR-ELECTRICAL",
    productType: "SolarElectrical",
    title: "Solar Panels & Standard Electrical – Compliance Checklist",
    status: "ACTIVE",
    version: "1.0.0",
    effectiveFrom: today,
    items: [
      { itemId: "TEST_REPORT", label: "IEC Test Report(s) (e.g., 61215/61730)", required: true, docTypes: ["TEST_REPORT"] },
      { itemId: "BOM", label: "Bill of Materials (BOM)", required: true, docTypes: ["BOM"] },
      { itemId: "MANUAL_EN", label: "User manual (English)", required: true, docTypes: ["MANUAL_EN"] },
      { itemId: "LABEL_RCM", label: "Label artwork (RCM-ready)", required: true, docTypes: ["LABEL_RCM"] },
    ],
  },
  {
    checklistId: "CHK-ISO",
    productType: "ISO",
    title: "ISO / Factory Management Systems – Readiness Checklist",
    status: "ACTIVE",
    version: "1.0.0",
    effectiveFrom: today,
    items: [
      { itemId: "ISO_SCOPE", label: "Scope statement (sites, products, exclusions)", required: true, docTypes: ["ISO_SCOPE"] },
      { itemId: "ISO_PROCESS_MAPS", label: "Process maps / procedures", required: true, docTypes: ["ISO_PROCESS_MAPS"] },
      { itemId: "ISO_MANUALS", label: "Management system manuals/policies", required: true, docTypes: ["ISO_MANUALS"] },
      { itemId: "ISO_INTERNAL_AUDIT", label: "Internal audit evidence (optional)", required: false, docTypes: ["ISO_INTERNAL_AUDIT"] },
      { itemId: "ISO_MGMT_REVIEW", label: "Management review evidence (optional)", required: false, docTypes: ["ISO_MGMT_REVIEW"] },
    ],
  },
];

export function getActiveChecklist(productType: ChecklistDefinition["productType"]) {
  return complianceChecklistSeed.find((item) => item.productType === productType && item.status === "ACTIVE") || null;
}

