import { CertificationType } from "./compliancePartners";

export interface CertificationRequirement {
  required: CertificationType[];
  conditional: CertificationType[];
  notes?: string;
}

const RCM_SUBCATEGORIES = new Set([
  "string-inverters",
  "hybrid-inverters",
  "microinverters",
  "dc-optimisers",
  "charge-controllers",
  "wall-mounted-lifepo4",
  "rack-server-cabinet-packs",
  "low-voltage-48v-packs",
  "high-voltage-stacks",
  "battery-cabinets-bms",
  "ac-wallboxes",
  "dc-fast-chargers",
  "portable-evse",
  "dc-isolators",
  "ac-isolators",
  "combiner-boxes",
  "junction-boxes",
  "switch-fuse-boxes",
  "mc4-branch-connectors",
  "dc-ac-cables",
  "earthing-bonding",
  "dc-fuses-holders",
  "dc-mcbs-breakers",
  "surge-protection",
  "rcd-rcbo",
  "contactors-relays",
  "metering",
  "data-loggers",
  "gateways",
  "smart-meters",
  "hems",
  "cloud-dongles",
  "home-displays",
  "generator-auto-start-modules",
  "ats-transfer-switches",
  "dc-dc-converters",
  "inverter-chargers",
  "pv-folding-kits",
  "insulation-testers",
  "iv-curve-tracers",
  "thermal-cameras",
]);

const GEMS_SUBCATEGORIES = new Set([
  "ac-wallboxes",
  "dc-fast-chargers",
  "heat-pump-water-heaters",
  "variable-speed-drives",
  "smart-thermostats",
]);

const STRUCTURAL_SUBCATEGORIES = new Set([
  "pitched-roof",
  "tile-roof",
  "metal-roof",
  "flat-roof-ballasted",
  "ground-mount",
  "carport-canopy",
  "pole-mount",
  "rail-clamps",
]);

export function getCertificationRequirements(
  categorySlug: string,
  subCategorySlug?: string
): CertificationRequirement {
  const required: CertificationType[] = [];
  const conditional: CertificationType[] = [];

  if (categorySlug === "solar-pv-modules") {
    required.push("CEC");
  }

  if (categorySlug === "inverters-power-electronics") {
    required.push("CEC", "RCM");
  }

  if (categorySlug === "energy-storage-batteries") {
    required.push("CEC", "RCM");
  }

  if (categorySlug === "ev-charging") {
    required.push("RCM");
  }

  if (categorySlug === "mounting-racking") {
    required.push("STRUCTURAL");
  }

  if (categorySlug === "switchgear-protection" || categorySlug === "monitoring-control-iot") {
    required.push("RCM");
  }

  if (subCategorySlug && RCM_SUBCATEGORIES.has(subCategorySlug) && !required.includes("RCM")) {
    required.push("RCM");
  }

  if (subCategorySlug && STRUCTURAL_SUBCATEGORIES.has(subCategorySlug) && !required.includes("STRUCTURAL")) {
    required.push("STRUCTURAL");
  }

  if (subCategorySlug && GEMS_SUBCATEGORIES.has(subCategorySlug)) {
    required.push("GEMS");
  }

  return { required, conditional };
}
