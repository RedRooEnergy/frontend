export type AttributeType = "text" | "number" | "select" | "boolean";

export interface AttributeTemplate {
  key: string;
  label: string;
  type: AttributeType;
  required?: boolean;
  unit?: string;
  allowedValues?: string[];
}

export interface AttributeTemplateGroup {
  categorySlug: string;
  subCategorySlug: string;
  fields: AttributeTemplate[];
}

// Simple starter templates per sub-category; extend later as needed.
export const attributeTemplates: AttributeTemplateGroup[] = [
  {
    categorySlug: "solar-pv-modules",
    subCategorySlug: "monocrystalline",
    fields: [
      { key: "wattage", label: "Module wattage", type: "number", unit: "W", required: true },
      { key: "efficiency", label: "Efficiency", type: "number", unit: "%", required: true },
      { key: "frame", label: "Frame material", type: "text" },
      { key: "bifacial", label: "Bifacial?", type: "boolean" },
    ],
  },
  {
    categorySlug: "inverters-power-electronics",
    subCategorySlug: "string-inverters",
    fields: [
      { key: "acPower", label: "AC Output Power", type: "number", unit: "kW", required: true },
      { key: "mppt", label: "MPPT Inputs", type: "number", required: true },
      { key: "phase", label: "Phase", type: "select", allowedValues: ["Single", "Three"], required: true },
    ],
  },
];
