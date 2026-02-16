export interface NumericRule {
  min: number;
  max: number;
  unit?: string;
}

const numericRules: Record<string, NumericRule> = {
  electrical_nominal_voltage: { min: 1, max: 2000, unit: "V" },
  electrical_min_voltage: { min: 0, max: 2000, unit: "V" },
  electrical_max_voltage: { min: 0, max: 2000, unit: "V" },
  electrical_nominal_current: { min: 0, max: 2000, unit: "A" },
  electrical_max_current: { min: 0, max: 2000, unit: "A" },
  electrical_nominal_power: { min: 1, max: 1000000, unit: "W" },
  electrical_peak_power: { min: 1, max: 1500000, unit: "W" },
  electrical_standby_power: { min: 0, max: 5000, unit: "W" },
  electrical_efficiency: { min: 0, max: 100, unit: "%" },
  electrical_power_factor: { min: 0, max: 1 },
  electrical_frequency: { min: 0, max: 120, unit: "Hz" },
  electrical_thd: { min: 0, max: 100, unit: "%" },

  thermal_max_humidity: { min: 0, max: 100, unit: "% RH" },

  mechanical_length: { min: 1, max: 10000, unit: "mm" },
  mechanical_width: { min: 1, max: 10000, unit: "mm" },
  mechanical_height: { min: 1, max: 10000, unit: "mm" },
  mechanical_volume: { min: 0, max: 100, unit: "m3" },
  mechanical_net_weight: { min: 0.1, max: 5000, unit: "kg" },
  mechanical_gross_weight: { min: 0.1, max: 5000, unit: "kg" },

  packaging_unit_net_weight: { min: 0.1, max: 5000, unit: "kg" },
  packaging_unit_gross_weight: { min: 0.1, max: 5000, unit: "kg" },
  packaging_box_net_weight: { min: 0.1, max: 5000, unit: "kg" },
  packaging_box_gross_weight: { min: 0.1, max: 5000, unit: "kg" },
  packaging_carton_net_weight: { min: 0.1, max: 5000, unit: "kg" },
  packaging_carton_gross_weight: { min: 0.1, max: 5000, unit: "kg" },

  logistics_lead_time_days: { min: 0, max: 365, unit: "days" },
  logistics_container_20ft_qty: { min: 0, max: 10000 },
  logistics_container_40ft_qty: { min: 0, max: 10000 },

  commercial_moq_unit: { min: 1, max: 100000 },
  commercial_moq_pallet: { min: 1, max: 100000 },
};

export function getNumericRule(key: string): NumericRule | undefined {
  if (numericRules[key]) return numericRules[key];

  if (key.includes("voltage")) return { min: 0, max: 2000, unit: "V" };
  if (key.includes("current")) return { min: 0, max: 2000, unit: "A" };
  if (key.includes("power")) return { min: 0, max: 1500000, unit: "W" };
  if (key.includes("efficiency")) return { min: 0, max: 100, unit: "%" };
  if (key.includes("temperature")) return { min: -60, max: 200, unit: "C" };
  if (key.includes("weight")) return { min: 0, max: 5000, unit: "kg" };
  if (key.includes("length") || key.includes("width") || key.includes("height")) {
    return { min: 1, max: 10000, unit: "mm" };
  }

  return undefined;
}
