export type ComplianceTag = "CEC" | "RCM" | "EESS" | "GEMS" | "None";

export interface Product {
  name: string;
  slug: string;
  shortDescription: string;
  keySpecs: string[];
  complianceTags: ComplianceTag[];
  image: string;
  sku: string;
  brand: string;
  supplierName: string;
  warranty: string;
  shippingNote: string;
  price: number;
  originalPrice: number;
  rating: number; // out of 5
  deal?: {
    isWeeklyDeal: boolean;
    dealWeekStart: string; // YYYY-MM-DD
    dealWeekEnd: string; // YYYY-MM-DD
    originalPrice: number;
  };
  featuredBid?: {
    amount: number;
    expiresAt: string; // YYYY-MM-DD
  };
  hotDeal?: {
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
    price: number;
    originalPrice: number;
    quantityLimit?: number;
    remainingQuantity?: number;
  };
  subCategorySlug: string;
  categorySlug: string;
}

export interface SubCategory {
  name: string;
  slug: string;
  products: Product[];
}

export interface Category {
  name: string;
  slug: string;
  description: string;
  subcategories: SubCategory[];
}

const compliancePool: ComplianceTag[][] = [
  ["CEC", "RCM"],
  ["RCM"],
  ["EESS"],
  ["GEMS"],
  ["None"],
];

function getCurrentWeekWindowStrings() {
  const now = new Date();
  const day = now.getDay(); // 0 Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return {
    start: weekStart.toISOString().slice(0, 10),
    end: weekEnd.toISOString().slice(0, 10),
  };
}

const { start: DEAL_START, end: DEAL_END } = getCurrentWeekWindowStrings();
const FEATURED_BID_EXPIRES = "2026-12-31";
const HOT_DEAL_SUBCATEGORIES = new Set([
  "monocrystalline",
  "string-inverters",
  "wall-mounted-lifepo4",
  "ac-wallboxes",
  "pitched-roof",
  "dc-isolators",
]);

function slugScore(value: string) {
  return value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function createProducts(categorySlug: string, subCategorySlug: string, label: string): Product[] {
  return Array.from({ length: 8 }).map((_, i) => {
    const idx = i % compliancePool.length;
    const isDeal = i === 0; // one deal per sub-category
    const basePrice = 1200 + i * 25;
    const supplierName = `Supplier ${String.fromCharCode(65 + (slugScore(subCategorySlug) % 5))}`;
    const featuredBid =
      i === 0
        ? {
            amount: 5000 + (slugScore(subCategorySlug) % 2000),
            expiresAt: FEATURED_BID_EXPIRES,
          }
        : undefined;
    const hotDeal =
      i === 0 && HOT_DEAL_SUBCATEGORIES.has(subCategorySlug)
        ? {
            start: DEAL_START,
            end: DEAL_END,
            price: basePrice - 200,
            originalPrice: basePrice + 150,
            quantityLimit: 120,
            remainingQuantity: 58,
          }
        : undefined;
    return {
      name: `${label} Product ${i + 1}`,
      slug: `${subCategorySlug}-prod-${i + 1}`,
      shortDescription: `Placeholder listing for ${label.toLowerCase()} in the RedRooEnergy catalogue.`,
      keySpecs: [
        "Rated for Australian conditions",
        "Spec placeholder 1",
        "Spec placeholder 2",
        "Spec placeholder 3",
        "Spec placeholder 4",
        "Spec placeholder 5",
      ],
      complianceTags: compliancePool[idx],
      image: "/placeholders/product.png",
      sku: `SKU-${subCategorySlug.toUpperCase()}-${i + 1}`,
      brand: "Placeholder Brand",
      supplierName,
      warranty: "Standard warranty placeholder",
      shippingNote: "DDP available subject to incoterms confirmation",
      price: basePrice,
      originalPrice: basePrice + 150,
      rating: 4 + (i % 2) * 0.5,
      deal: isDeal
        ? {
            isWeeklyDeal: true,
            dealWeekStart: DEAL_START,
            dealWeekEnd: DEAL_END,
            originalPrice: basePrice + 150,
          }
        : undefined,
      featuredBid,
      hotDeal,
      subCategorySlug,
      categorySlug,
    };
  });
}

export const categories: Category[] = [
  {
    name: "Solar PV Modules",
    slug: "solar-pv-modules",
    description: "Module formats and constructions for diverse site conditions.",
    subcategories: [
      { name: "Monocrystalline", slug: "monocrystalline", products: createProducts("solar-pv-modules", "monocrystalline", "Monocrystalline Module") },
      { name: "Bifacial", slug: "bifacial", products: createProducts("solar-pv-modules", "bifacial", "Bifacial Module") },
      { name: "Flexible", slug: "flexible", products: createProducts("solar-pv-modules", "flexible", "Flexible Module") },
      { name: "Building-Integrated (BIPV)", slug: "building-integrated-bipv", products: createProducts("solar-pv-modules", "building-integrated-bipv", "BIPV Module") },
      { name: "Portable", slug: "portable", products: createProducts("solar-pv-modules", "portable", "Portable Module") },
    ],
  },
  {
    name: "Inverters & Power Electronics",
    slug: "inverters-power-electronics",
    description: "Conversion and control hardware for grid and hybrid systems.",
    subcategories: [
      { name: "String Inverters", slug: "string-inverters", products: createProducts("inverters-power-electronics", "string-inverters", "String Inverter") },
      { name: "Hybrid Inverters", slug: "hybrid-inverters", products: createProducts("inverters-power-electronics", "hybrid-inverters", "Hybrid Inverter") },
      { name: "Microinverters", slug: "microinverters", products: createProducts("inverters-power-electronics", "microinverters", "Microinverter") },
      { name: "DC Optimisers", slug: "dc-optimisers", products: createProducts("inverters-power-electronics", "dc-optimisers", "DC Optimiser") },
      { name: "Charge Controllers (MPPT/PWM)", slug: "charge-controllers", products: createProducts("inverters-power-electronics", "charge-controllers", "Charge Controller") },
    ],
  },
  {
    name: "Energy Storage (Batteries)",
    slug: "energy-storage-batteries",
    description: "Stationary storage formats for residential and C&I deployments.",
    subcategories: [
      { name: "Wall-Mounted LiFePO₄", slug: "wall-mounted-lifepo4", products: createProducts("energy-storage-batteries", "wall-mounted-lifepo4", "Wall-Mounted Battery") },
      { name: "Rack/Server-Cabinet Packs", slug: "rack-server-cabinet-packs", products: createProducts("energy-storage-batteries", "rack-server-cabinet-packs", "Rack Battery") },
      { name: "Low-Voltage (48 V) Packs", slug: "low-voltage-48v-packs", products: createProducts("energy-storage-batteries", "low-voltage-48v-packs", "Low Voltage Pack") },
      { name: "High-Voltage Stacks", slug: "high-voltage-stacks", products: createProducts("energy-storage-batteries", "high-voltage-stacks", "High Voltage Stack") },
      { name: "Battery Cabinets/BMS", slug: "battery-cabinets-bms", products: createProducts("energy-storage-batteries", "battery-cabinets-bms", "Battery Cabinet") },
    ],
  },
  {
    name: "EV Charging",
    slug: "ev-charging",
    description: "Charging hardware and accessories for AC and DC EV supply.",
    subcategories: [
      { name: "AC Wallboxes (7–22 kW)", slug: "ac-wallboxes", products: createProducts("ev-charging", "ac-wallboxes", "AC Wallbox") },
      { name: "DC Fast Chargers", slug: "dc-fast-chargers", products: createProducts("ev-charging", "dc-fast-chargers", "DC Fast Charger") },
      { name: "Portable EVSE", slug: "portable-evse", products: createProducts("ev-charging", "portable-evse", "Portable EVSE") },
      { name: "Cables/Adapters", slug: "cables-adapters", products: createProducts("ev-charging", "cables-adapters", "EV Cable") },
      { name: "Load-Balancing Hubs", slug: "load-balancing-hubs", products: createProducts("ev-charging", "load-balancing-hubs", "Load-Balancing Hub") },
    ],
  },
  {
    name: "Mounting & Racking",
    slug: "mounting-racking",
    description: "Mechanical mounting solutions across roof, ground, and specialty applications.",
    subcategories: [
      { name: "Pitched-Roof", slug: "pitched-roof", products: createProducts("mounting-racking", "pitched-roof", "Pitched Roof Mount") },
      { name: "Tile-Roof", slug: "tile-roof", products: createProducts("mounting-racking", "tile-roof", "Tile Roof Mount") },
      { name: "Metal-Roof (Klip-Lok/Standing-Seam)", slug: "metal-roof", products: createProducts("mounting-racking", "metal-roof", "Metal Roof Mount") },
      { name: "Flat-Roof Ballasted", slug: "flat-roof-ballasted", products: createProducts("mounting-racking", "flat-roof-ballasted", "Flat Roof Mount") },
      { name: "Ground-Mount", slug: "ground-mount", products: createProducts("mounting-racking", "ground-mount", "Ground Mount") },
      { name: "Carport/Canopy", slug: "carport-canopy", products: createProducts("mounting-racking", "carport-canopy", "Carport Canopy") },
      { name: "Pole-Mount", slug: "pole-mount", products: createProducts("mounting-racking", "pole-mount", "Pole Mount") },
      { name: "Rail & Clamps", slug: "rail-clamps", products: createProducts("mounting-racking", "rail-clamps", "Rail & Clamp") },
    ],
  },
  {
    name: "Electrical BOS (Balance of System)",
    slug: "electrical-bos",
    description: "Electrical balance components for safe DC/AC integration.",
    subcategories: [
      { name: "DC Isolators", slug: "dc-isolators", products: createProducts("electrical-bos", "dc-isolators", "DC Isolator") },
      { name: "AC Isolators", slug: "ac-isolators", products: createProducts("electrical-bos", "ac-isolators", "AC Isolator") },
      { name: "Combiner Boxes", slug: "combiner-boxes", products: createProducts("electrical-bos", "combiner-boxes", "Combiner Box") },
      { name: "Junction Boxes", slug: "junction-boxes", products: createProducts("electrical-bos", "junction-boxes", "Junction Box") },
      { name: "Switch / fuse Boxes", slug: "switch-fuse-boxes", products: createProducts("electrical-bos", "switch-fuse-boxes", "Switch / Fuse Box") },
      { name: "MC4 & Branch Connectors", slug: "mc4-branch-connectors", products: createProducts("electrical-bos", "mc4-branch-connectors", "Connector") },
      { name: "DC/AC Cables", slug: "dc-ac-cables", products: createProducts("electrical-bos", "dc-ac-cables", "DC/AC Cable") },
      { name: "Glands", slug: "glands", products: createProducts("electrical-bos", "glands", "Gland") },
      { name: "Conduit & Trunking", slug: "conduit-trunking", products: createProducts("electrical-bos", "conduit-trunking", "Conduit") },
      { name: "Earthing/Bonding", slug: "earthing-bonding", products: createProducts("electrical-bos", "earthing-bonding", "Earthing/Bonding") },
    ],
  },
  {
    name: "Switchgear & Protection",
    slug: "switchgear-protection",
    description: "Protective devices and switching for PV and storage circuits.",
    subcategories: [
      { name: "DC Fuses & Holders", slug: "dc-fuses-holders", products: createProducts("switchgear-protection", "dc-fuses-holders", "DC Fuse") },
      { name: "DC MCBs/Breakers", slug: "dc-mcbs-breakers", products: createProducts("switchgear-protection", "dc-mcbs-breakers", "DC Breaker") },
      { name: "Surge Protection (DC/AC)", slug: "surge-protection", products: createProducts("switchgear-protection", "surge-protection", "Surge Protector") },
      { name: "RCD/RCBO", slug: "rcd-rcbo", products: createProducts("switchgear-protection", "rcd-rcbo", "RCD/RCBO") },
      { name: "Contactors & Relays", slug: "contactors-relays", products: createProducts("switchgear-protection", "contactors-relays", "Contactor") },
      { name: "Metering (kWh, CTs)", slug: "metering", products: createProducts("switchgear-protection", "metering", "Metering") },
    ],
  },
  {
    name: "Monitoring, Control & IoT",
    slug: "monitoring-control-iot",
    description: "Visibility and control devices for PV, storage, and load management.",
    subcategories: [
      { name: "Data Loggers", slug: "data-loggers", products: createProducts("monitoring-control-iot", "data-loggers", "Data Logger") },
      { name: "Gateways", slug: "gateways", products: createProducts("monitoring-control-iot", "gateways", "Gateway") },
      { name: "Smart Meters", slug: "smart-meters", products: createProducts("monitoring-control-iot", "smart-meters", "Smart Meter") },
      { name: "Energy Management Systems (HEMS)", slug: "hems", products: createProducts("monitoring-control-iot", "hems", "HEMS") },
      { name: "Cloud Dongles", slug: "cloud-dongles", products: createProducts("monitoring-control-iot", "cloud-dongles", "Cloud Dongle") },
      { name: "Home Displays", slug: "home-displays", products: createProducts("monitoring-control-iot", "home-displays", "Home Display") },
    ],
  },
  {
    name: "Off-Grid & Hybrid Accessories",
    slug: "off-grid-hybrid-accessories",
    description: "Supporting equipment for stand-alone and hybrid systems.",
    subcategories: [
      { name: "Generator Auto-Start Modules", slug: "generator-auto-start-modules", products: createProducts("off-grid-hybrid-accessories", "generator-auto-start-modules", "Auto-Start Module") },
      { name: "ATS/Transfer Switches", slug: "ats-transfer-switches", products: createProducts("off-grid-hybrid-accessories", "ats-transfer-switches", "Transfer Switch") },
      { name: "DC-DC Converters", slug: "dc-dc-converters", products: createProducts("off-grid-hybrid-accessories", "dc-dc-converters", "DC-DC Converter") },
      { name: "Inverter Chargers", slug: "inverter-chargers", products: createProducts("off-grid-hybrid-accessories", "inverter-chargers", "Inverter Charger") },
      { name: "PV Folding Kits", slug: "pv-folding-kits", products: createProducts("off-grid-hybrid-accessories", "pv-folding-kits", "PV Folding Kit") },
    ],
  },
  {
    name: "Solar Thermal & Heat Pumps",
    slug: "solar-thermal-heat-pumps",
    description: "Thermal collection and heat pump solutions.",
    subcategories: [
      { name: "Flat-Plate Collectors", slug: "flat-plate-collectors", products: createProducts("solar-thermal-heat-pumps", "flat-plate-collectors", "Flat-Plate Collector") },
      { name: "Evacuated Tubes", slug: "evacuated-tubes", products: createProducts("solar-thermal-heat-pumps", "evacuated-tubes", "Evacuated Tube") },
      { name: "Circulation Pumps/Stations", slug: "circulation-pumps-stations", products: createProducts("solar-thermal-heat-pumps", "circulation-pumps-stations", "Circulation Pump") },
      { name: "Heat Pump Water Heaters", slug: "heat-pump-water-heaters", products: createProducts("solar-thermal-heat-pumps", "heat-pump-water-heaters", "Heat Pump WH") },
      { name: "Buffer Tanks", slug: "buffer-tanks", products: createProducts("solar-thermal-heat-pumps", "buffer-tanks", "Buffer Tank") },
    ],
  },
  {
    name: "HVAC & Load-Side Efficiency",
    slug: "hvac-load-efficiency",
    description: "Load optimisation and efficiency devices.",
    subcategories: [
      { name: "Variable-Speed Drives", slug: "variable-speed-drives", products: createProducts("hvac-load-efficiency", "variable-speed-drives", "Variable-Speed Drive") },
      { name: "Smart Thermostats", slug: "smart-thermostats", products: createProducts("hvac-load-efficiency", "smart-thermostats", "Smart Thermostat") },
      { name: "Demand Response Relays", slug: "demand-response-relays", products: createProducts("hvac-load-efficiency", "demand-response-relays", "Demand Response Relay") },
    ],
  },
  {
    name: "Tools, Test & PPE",
    slug: "tools-test-ppe",
    description: "Tools and safety equipment for PV installation and maintenance.",
    subcategories: [
      { name: "PV Crimpers & Strippers", slug: "pv-crimpers-strippers", products: createProducts("tools-test-ppe", "pv-crimpers-strippers", "PV Crimper") },
      { name: "Torque Wrenches", slug: "torque-wrenches", products: createProducts("tools-test-ppe", "torque-wrenches", "Torque Wrench") },
      { name: "Insulation Testers", slug: "insulation-testers", products: createProducts("tools-test-ppe", "insulation-testers", "Insulation Tester") },
      { name: "IV Curve Tracers", slug: "iv-curve-tracers", products: createProducts("tools-test-ppe", "iv-curve-tracers", "IV Curve Tracer") },
      { name: "Thermal Cameras", slug: "thermal-cameras", products: createProducts("tools-test-ppe", "thermal-cameras", "Thermal Camera") },
      { name: "Arc-Flash PPE", slug: "arc-flash-ppe", products: createProducts("tools-test-ppe", "arc-flash-ppe", "Arc-Flash PPE") },
      { name: "Lock-Out/Tag-Out", slug: "lock-out-tag-out", products: createProducts("tools-test-ppe", "lock-out-tag-out", "Lock-Out/Tag-Out") },
    ],
  },
  {
    name: "Labels, Compliance & Documentation",
    slug: "labels-compliance-documentation",
    description: "Labelling and documentation for compliance and handover.",
    subcategories: [
      { name: "Warning/Service Labels", slug: "warning-service-labels", products: createProducts("labels-compliance-documentation", "warning-service-labels", "Label Set") },
      { name: "Single-Line Diagrams", slug: "single-line-diagrams", products: createProducts("labels-compliance-documentation", "single-line-diagrams", "Single-Line Diagram") },
      { name: "Commissioning Sheets", slug: "commissioning-sheets", products: createProducts("labels-compliance-documentation", "commissioning-sheets", "Commissioning Sheet") },
      { name: "Warranty Cards", slug: "warranty-cards", products: createProducts("labels-compliance-documentation", "warranty-cards", "Warranty Card") },
    ],
  },
  {
    name: "Packaging, Spares & Consumables",
    slug: "packaging-spares-consumables",
    description: "Ancillary items for installation and logistics completeness.",
    subcategories: [
      { name: "Spare Connectors", slug: "spare-connectors", products: createProducts("packaging-spares-consumables", "spare-connectors", "Spare Connector") },
      { name: "End-Caps", slug: "end-caps", products: createProducts("packaging-spares-consumables", "end-caps", "End Cap") },
      { name: "Rail Joiners", slug: "rail-joiners", products: createProducts("packaging-spares-consumables", "rail-joiners", "Rail Joiner") },
      { name: "Fasteners", slug: "fasteners", products: createProducts("packaging-spares-consumables", "fasteners", "Fastener Kit") },
      { name: "Sealants", slug: "sealants", products: createProducts("packaging-spares-consumables", "sealants", "Sealant") },
      { name: "Anti-Seize", slug: "anti-seize", products: createProducts("packaging-spares-consumables", "anti-seize", "Anti-Seize") },
      { name: "Pallet/Carton Materials", slug: "pallet-carton-materials", products: createProducts("packaging-spares-consumables", "pallet-carton-materials", "Pallet Material") },
    ],
  },
  {
    name: "Other Emerging Technologies",
    slug: "other-emerging-technologies",
    description: "Forward-looking specifications and integration elements.",
    subcategories: [
      { name: "Electrical & Energy Specifications", slug: "electrical-energy-specifications", products: createProducts("other-emerging-technologies", "electrical-energy-specifications", "Electrical Spec") },
      { name: "Control, Communication & Intelligence", slug: "control-communication-intelligence", products: createProducts("other-emerging-technologies", "control-communication-intelligence", "Control & Comms") },
      { name: "System Integration & Compatibility", slug: "system-integration-compatibility", products: createProducts("other-emerging-technologies", "system-integration-compatibility", "System Integration") },
      { name: "Environmental & Operating Parameters", slug: "environmental-operating-parameters", products: createProducts("other-emerging-technologies", "environmental-operating-parameters", "Environmental Parameters") },
      { name: "Physical & Mechanical Specifications", slug: "physical-mechanical-specifications", products: createProducts("other-emerging-technologies", "physical-mechanical-specifications", "Mechanical Spec") },
      { name: "Performance & Functional Metrics", slug: "performance-functional-metrics", products: createProducts("other-emerging-technologies", "performance-functional-metrics", "Performance Metric") },
      { name: "Protection & Operational Controls", slug: "protection-operational-controls", products: createProducts("other-emerging-technologies", "protection-operational-controls", "Protection Control") },
      { name: "Compliance & Certification Indicators", slug: "compliance-certification-indicators", products: createProducts("other-emerging-technologies", "compliance-certification-indicators", "Certification Indicator") },
      { name: "Chemical / Thermal / Pressure", slug: "chemical-thermal-pressure", products: createProducts("other-emerging-technologies", "chemical-thermal-pressure", "Chemical/Thermal") },
      { name: "Installation & Commissioning Data", slug: "installation-commissioning-data", products: createProducts("other-emerging-technologies", "installation-commissioning-data", "Commissioning Data") },
      { name: "Logistics & Transport Specifications", slug: "logistics-transport-specifications", products: createProducts("other-emerging-technologies", "logistics-transport-specifications", "Logistics Spec") },
      { name: "Lifecycle & Support Specifications", slug: "lifecycle-support-specifications", products: createProducts("other-emerging-technologies", "lifecycle-support-specifications", "Lifecycle Spec") },
    ],
  },
];

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getSubCategory(categorySlug: string, subSlug: string): { category: Category; subcategory: SubCategory } | undefined {
  const category = getCategory(categorySlug);
  if (!category) return undefined;
  const subcategory = category.subcategories.find((s) => s.slug === subSlug);
  if (!subcategory) return undefined;
  return { category, subcategory };
}

export function getProduct(slug: string): { product: Product; category: Category; subcategory: SubCategory } | undefined {
  for (const category of categories) {
    for (const sub of category.subcategories) {
      const product = sub.products.find((p) => p.slug === slug);
      if (product) return { product, category, subcategory: sub };
    }
  }
  return undefined;
}

export function getAllCategoryParams() {
  return categories.map((c) => ({ categorySlug: c.slug }));
}

export function getAllSubCategoryParams() {
  const params: { categorySlug: string; subCategorySlug: string }[] = [];
  categories.forEach((c) => {
    c.subcategories.forEach((s) => params.push({ categorySlug: c.slug, subCategorySlug: s.slug }));
  });
  return params;
}

export function getAllProductParams() {
  const params: { productSlug: string }[] = [];
  categories.forEach((c) => {
    c.subcategories.forEach((s) => {
      s.products.forEach((p) => params.push({ productSlug: p.slug }));
    });
  });
  return params;
}
