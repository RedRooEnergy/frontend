export type FieldType = "text" | "number" | "select" | "boolean" | "textarea" | "file" | "date";

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  unit?: string;
  helper?: string;
  placeholder?: string;
  readOnly?: boolean;
  fullWidth?: boolean;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

const text = (key: string, label: string, options: Partial<FormField> = {}): FormField => ({
  key,
  label,
  type: "text",
  ...options,
});

const num = (key: string, label: string, options: Partial<FormField> = {}): FormField => ({
  key,
  label,
  type: "number",
  ...options,
});

const select = (key: string, label: string, values: string[], options: Partial<FormField> = {}): FormField => ({
  key,
  label,
  type: "select",
  options: values,
  ...options,
});

const bool = (key: string, label: string, options: Partial<FormField> = {}): FormField => ({
  key,
  label,
  type: "boolean",
  ...options,
});

const area = (key: string, label: string, options: Partial<FormField> = {}): FormField => ({
  key,
  label,
  type: "textarea",
  fullWidth: true,
  ...options,
});

const file = (key: string, label: string, options: Partial<FormField> = {}): FormField => ({
  key,
  label,
  type: "file",
  ...options,
});

const date = (key: string, label: string, options: Partial<FormField> = {}): FormField => ({
  key,
  label,
  type: "date",
  ...options,
});

const masterSections: FormSection[] = [
  {
    id: "identity",
    title: "Section 1 - Product Identity and Classification",
    fields: [
      text("identity_supplier_legal_name", "Supplier legal entity name", { required: true }),
      text("identity_supplier_trading_name", "Supplier trading name", { required: true }),
      text("identity_supplier_country_of_manufacture", "Supplier country of manufacture", { required: true }),
      text("identity_product_commercial_name", "Product commercial name", { required: true }),
      text("identity_product_technical_name", "Product technical name", { required: true }),
      text("identity_internal_supplier_sku", "Internal supplier SKU", { required: true }),
      text("identity_manufacturer_sku", "Manufacturer SKU / model number", { required: true }),
      select("identity_product_category", "Product category", [], { required: true, readOnly: true }),
      select("identity_product_subcategory", "Product sub-category", [], { required: true, readOnly: true }),
      text("identity_variant_identifier", "Product variant identifier"),
      text("identity_revision_version", "Revision / version number", { required: true }),
      date("identity_first_production_date", "First production date"),
      select("identity_production_status", "Current production status", ["Active", "EOL", "Limited"], { required: true }),
      select("identity_intended_market", "Intended market", ["Residential", "Commercial", "Industrial", "Utility"], {
        required: true,
      }),
      select(
        "identity_installation_environment",
        "Intended installation environment",
        ["Indoor", "Outdoor", "Mixed"],
        { required: true }
      ),
    ],
  },
  {
    id: "description",
    title: "Section 2 - Product Description (Structured)",
    fields: [
      area("description_short", "Short description (max 500 characters)", { required: true }),
      area("description_long", "Long technical description"),
      area("description_functional_purpose", "Functional purpose"),
      area("description_typical_use_cases", "Typical use cases"),
      area("description_limitations", "Known limitations or exclusions"),
      area("description_installation_summary", "Installation summary"),
      area("description_maintenance_summary", "Maintenance summary"),
      area("description_safety_overview", "Safety overview"),
      area("description_compatibility_overview", "Compatibility overview"),
      area("description_incompatibilities", "Known incompatibilities"),
    ],
  },
  {
    id: "electrical",
    title: "Section 3 - Electrical Specifications",
    description: "Displayed even if not applicable. Use N/A where relevant.",
    fields: [
      num("electrical_nominal_voltage", "Nominal voltage (V)"),
      num("electrical_min_voltage", "Minimum voltage (V)"),
      num("electrical_max_voltage", "Maximum voltage (V)"),
      num("electrical_nominal_current", "Nominal current (A)"),
      num("electrical_max_current", "Maximum current (A)"),
      num("electrical_nominal_power", "Nominal power (W or kW)"),
      num("electrical_peak_power", "Peak power (W or kW)"),
      num("electrical_standby_power", "Standby power consumption (W)"),
      num("electrical_efficiency", "Efficiency (%)"),
      num("electrical_power_factor", "Power factor"),
      num("electrical_frequency", "Frequency (Hz)"),
      select("electrical_phase", "Phase", ["Single", "Three", "DC"]),
      text("electrical_surge_tolerance", "Surge tolerance"),
      text("electrical_inrush_current", "Inrush current"),
      num("electrical_thd", "Harmonic distortion (THD %)"),
      text("electrical_short_circuit_rating", "Short-circuit rating"),
      text("electrical_isolation_method", "Isolation method"),
      text("electrical_earthing_requirement", "Earthing requirement"),
      bool("electrical_over_voltage_protection", "Over-voltage protection present"),
      bool("electrical_over_current_protection", "Over-current protection present"),
    ],
  },
  {
    id: "thermal",
    title: "Section 4 - Thermal and Environmental Specifications",
    fields: [
      text("thermal_operating_temp", "Operating temperature range (C)"),
      text("thermal_storage_temp", "Storage temperature range (C)"),
      text("thermal_max_humidity", "Maximum humidity (% RH)"),
      text("thermal_altitude", "Altitude rating (m)"),
      select("thermal_cooling_method", "Cooling method", ["Passive", "Forced", "Liquid"]),
      text("thermal_noise_level", "Noise level (dB)"),
      text("thermal_derating_profile", "Thermal derating profile"),
      text("thermal_heat_dissipation", "Heat dissipation (W)"),
      text("thermal_fire_resistance", "Fire resistance rating"),
      text("thermal_flame_propagation", "Flame propagation rating"),
      text("thermal_chemical_tolerance", "Chemical exposure tolerance"),
      text("thermal_uv_tolerance", "UV exposure tolerance"),
      text("thermal_salt_mist_tolerance", "Salt mist tolerance"),
    ],
  },
  {
    id: "mechanical",
    title: "Section 5 - Mechanical and Physical Specifications",
    fields: [
      num("mechanical_length", "Product length (mm)"),
      num("mechanical_width", "Product width (mm)"),
      num("mechanical_height", "Product height (mm)"),
      num("mechanical_volume", "Product volume (m3)"),
      num("mechanical_net_weight", "Net unit weight (kg)"),
      num("mechanical_gross_weight", "Gross unit weight (kg)"),
      text("mechanical_enclosure_material", "Enclosure material"),
      text("mechanical_frame_material", "Frame material"),
      text("mechanical_surface_treatment", "Surface treatment / coating"),
      text("mechanical_impact_resistance", "Impact resistance rating"),
      text("mechanical_ip_rating", "IP rating"),
      text("mechanical_ik_rating", "IK rating"),
      text("mechanical_mounting_methods", "Mounting method(s)"),
      text("mechanical_orientation_constraints", "Orientation constraints"),
      text("mechanical_vibration_tolerance", "Vibration tolerance"),
      text("mechanical_shock_tolerance", "Shock tolerance"),
    ],
  },
  {
    id: "packaging",
    title: "Section 6 - Packaging and Unit Hierarchy",
    fields: [
      text("packaging_unit_units_per_retail", "Unit level - units per retail unit"),
      num("packaging_unit_net_weight", "Unit level - net unit weight"),
      num("packaging_unit_gross_weight", "Unit level - gross unit weight"),
      text("packaging_unit_material", "Unit level - packaging material"),
      text("packaging_unit_dimensions", "Unit level - dimensions (L x W x H)"),
      num("packaging_box_units", "Box level - units per box"),
      num("packaging_box_net_weight", "Box level - net weight"),
      num("packaging_box_gross_weight", "Box level - gross weight"),
      text("packaging_box_dimensions", "Box level - dimensions"),
      text("packaging_box_stack_limit", "Box level - stack limit"),
      num("packaging_carton_boxes", "Carton level - boxes per carton"),
      num("packaging_carton_net_weight", "Carton level - net weight"),
      num("packaging_carton_gross_weight", "Carton level - gross weight"),
      text("packaging_carton_dimensions", "Carton level - dimensions"),
      num("packaging_cartons_per_pallet", "Cartons per pallet"),
      text("packaging_pallet_type", "Pallet type"),
      num("packaging_pallet_net_weight", "Pallet net weight"),
      num("packaging_pallet_gross_weight", "Pallet gross weight"),
      text("packaging_pallet_dimensions", "Pallet dimensions"),
      text("packaging_pallet_max_stack_height", "Max stack height"),
      text("packaging_forklift_notes", "Forklift handling notes"),
    ],
  },
  {
    id: "logistics",
    title: "Section 7 - Logistics and Transport",
    fields: [
      text("logistics_country_of_origin", "Country of origin"),
      text("logistics_hs_code", "HS / TARIC code"),
      text("logistics_dangerous_goods_class", "Dangerous goods classification"),
      text("logistics_un_number", "UN number (if applicable)"),
      text("logistics_battery_transport_status", "Battery transport status (if applicable)"),
      text("logistics_shipping_orientation", "Shipping orientation constraints"),
      select("logistics_fragility", "Fragility classification", ["Standard", "Fragile", "Oversized"]),
      bool("logistics_temp_controlled", "Temperature-controlled shipping required"),
      bool("logistics_moisture_protection", "Moisture protection required"),
      text("logistics_container_loading_20ft", "Container loading data - 20ft"),
      text("logistics_container_loading_40ft", "Container loading data - 40ft"),
      num("logistics_typical_lead_time", "Typical lead time (days)"),
      text("logistics_incoterms_supported", "Incoterms supported"),
      bool("logistics_ddp_eligibility_confirmation", "DDP eligibility confirmation"),
    ],
  },
  {
    id: "compliance",
    title: "Section 8 - Compliance and Certification",
    fields: [
      text("compliance_au_regulatory_status", "Australian regulatory status", { required: true }),
      text("compliance_rcm_status", "RCM status", { required: true }),
      text("compliance_electrical_safety_approvals", "Electrical safety approvals", { required: true }),
      text("compliance_emc", "EMC compliance", { required: true }),
      text("compliance_performance_standards", "Performance standards"),
      text("compliance_iec_standards", "IEC standards list", { required: true }),
      text("compliance_as_nzs_standards", "AS/NZS standards list", { required: true }),
      text("compliance_fire", "Fire compliance"),
      text("compliance_environmental", "Environmental compliance"),
      text("compliance_chemical", "Chemical compliance (RoHS / REACH)"),
      text("compliance_energy_labelling", "Energy labelling (if applicable)"),
      text("compliance_issuing_body", "Certification issuing body", { required: true }),
      text("compliance_certificate_numbers", "Certificate numbers", { required: true }),
      text("compliance_certificate_expiry", "Certificate expiry dates", { required: true }),
      file("compliance_test_report_uploads", "Test report uploads", { required: true }),
      text("compliance_serialisation_traceability", "Serialisation / traceability method", { required: true }),
    ],
  },
  {
    id: "software",
    title: "Section 9 - Software, Firmware, and Digital (if applicable)",
    fields: [
      bool("software_embedded_present", "Embedded software present"),
      text("software_firmware_version", "Firmware version"),
      text("software_update_method", "Update method"),
      bool("software_ota_capable", "OTA capability"),
      text("software_communication_protocols", "Communication protocols"),
      text("software_api_availability", "API availability"),
      text("software_cybersecurity_controls", "Cybersecurity controls"),
      text("software_data_encryption", "Data encryption standard"),
      text("software_data_storage_location", "Data storage location"),
      text("software_cloud_dependency", "Cloud dependency disclosure"),
      text("software_end_of_support", "End-of-support date"),
    ],
  },
  {
    id: "installation",
    title: "Section 10 - Installation and Commissioning",
    fields: [
      text("installation_qualifications", "Installer qualification required"),
      text("installation_tools_required", "Tools required"),
      area("installation_steps_summary", "Installation steps summary"),
      area("installation_commissioning_steps", "Commissioning steps summary"),
      bool("installation_calibration_required", "Calibration required"),
      text("installation_commissioning_docs", "Commissioning documentation provided"),
      text("installation_time", "Typical installation time"),
      text("installation_site_prerequisites", "Site prerequisites"),
      area("installation_pre_checks", "Pre-installation checks"),
      area("installation_post_checks", "Post-installation checks"),
    ],
  },
  {
    id: "operations",
    title: "Section 11 - Operation, Maintenance, and Lifecycle",
    fields: [
      text("operations_expected_service_life", "Expected service life"),
      text("operations_duty_cycle", "Duty cycle"),
      text("operations_maintenance_interval", "Preventive maintenance interval"),
      text("operations_consumables", "Consumables required"),
      area("operations_spare_parts_list", "Spare parts list"),
      text("operations_field_replaceable", "Field-replaceable components"),
      area("operations_failure_modes", "Failure modes"),
      text("operations_mtbf", "MTBF (if available)"),
      area("operations_decommissioning", "Decommissioning procedure"),
      area("operations_recycling_disposal", "Recycling / disposal guidance"),
    ],
  },
  {
    id: "warranty",
    title: "Section 12 - Warranty and Support",
    fields: [
      text("warranty_type", "Warranty type", { required: true }),
      text("warranty_duration", "Warranty duration", { required: true }),
      area("warranty_scope", "Warranty scope"),
      area("warranty_exclusions", "Warranty exclusions"),
      area("warranty_claim_procedure", "Claim procedure"),
      area("warranty_rma_process", "RMA process"),
      text("warranty_local_service_availability", "Local service availability"),
      text("warranty_spare_parts_availability_period", "Spare parts availability period"),
      area("warranty_support_channels", "Technical support channels"),
      text("warranty_support_sla", "Support response SLA"),
    ],
  },
  {
    id: "commercial",
    title: "Section 13 - Commercial Terms",
    fields: [
      text("commercial_moq", "Minimum order quantity (unit / box / pallet)", { required: true }),
      text("commercial_sample_availability", "Sample availability"),
      text("commercial_pricing_basis", "Pricing basis", { required: true }),
      area("commercial_volume_pricing_tiers", "Volume pricing tiers"),
      text("commercial_currency", "Currency", { required: true }),
      text("commercial_price_validity", "Price validity period"),
      text("commercial_payment_terms", "Payment terms", { required: true }),
      area("commercial_cancellation_policy", "Cancellation policy"),
      area("commercial_return_policy", "Return policy"),
      text("commercial_restocking_fees", "Restocking fees"),
      area("commercial_replacement_policy", "Replacement policy"),
    ],
  },
  {
    id: "declarations",
    title: "Section 14 - Supplier Declarations (Mandatory)",
    fields: [
      bool("declarations_accuracy", "Accuracy declaration", { required: true }),
      bool("declarations_compliance", "Compliance declaration", { required: true }),
      bool("declarations_safety", "Safety declaration", { required: true }),
      bool("declarations_export_legality", "Export legality declaration", { required: true }),
      bool("declarations_sanctions", "Sanctions compliance declaration", { required: true }),
      bool("declarations_change_notification", "Change notification obligation", { required: true }),
      bool("declarations_audit_consent", "Audit consent acknowledgement", { required: true }),
      text("declarations_digital_signature", "Digital signature", { required: true }),
      text("declarations_submission_timestamp", "Submission timestamp", { readOnly: true }),
    ],
  },
  {
    id: "platform_output",
    title: "Section 15 - Platform Validation Output (Read Only)",
    fields: [
      text("platform_completeness_score", "Completeness score", { readOnly: true }),
      text("platform_compliance_status", "Compliance pass/fail", { readOnly: true }),
      text("platform_ddp_eligibility", "DDP eligibility status", { readOnly: true }),
      text("platform_audit_readiness", "Audit readiness status", { readOnly: true }),
      text("platform_approval_status", "Approval status", { readOnly: true }),
      text("platform_rejection_reason", "Rejection reason (if any)", { readOnly: true }),
      text("platform_version_history", "Version history", { readOnly: true }),
      text("platform_change_log_hash", "Change log hash", { readOnly: true }),
      text("platform_final_confirmation", "Final confirmation", { readOnly: true }),
    ],
  },
];

const categorySectionsBySlug: Record<string, FormSection[]> = {
  "solar-pv-modules": [
    {
      id: "pv_identity",
      title: "Solar PV Modules - Product Identity",
      fields: [
        text("pv_product_name", "Product name (marketing + technical)", { required: true }),
        select("pv_module_type", "Module type", ["Monocrystalline", "Bifacial", "Flexible", "BIPV", "Portable"], {
          required: true,
        }),
        select("pv_cell_technology", "Cell technology", ["PERC", "TOPCon", "HJT", "IBC"], { required: true }),
        select("pv_intended_application", "Intended application", ["Residential", "Commercial", "Utility", "Portable"], {
          required: true,
        }),
        file("pv_datasheet_upload", "Datasheet upload", { required: true }),
      ],
    },
    {
      id: "pv_electrical",
      title: "Solar PV Modules - Electrical Specifications",
      fields: [
        num("pv_nominal_power", "Nominal power (Wp)", { required: true }),
        text("pv_power_tolerance", "Power tolerance (+/- %)", { required: true }),
        num("pv_voc", "Voc (V)", { required: true }),
        num("pv_isc", "Isc (A)", { required: true }),
        num("pv_vmp", "Vmp (V)", { required: true }),
        num("pv_imp", "Imp (A)", { required: true }),
        num("pv_module_efficiency", "Module efficiency (%)"),
        text("pv_temp_coeff_pmax", "Temperature coefficient (Pmax)"),
        text("pv_temp_coeff_voc", "Temperature coefficient (Voc)"),
        text("pv_temp_coeff_isc", "Temperature coefficient (Isc)"),
      ],
    },
    {
      id: "pv_mechanical",
      title: "Solar PV Modules - Mechanical Specifications",
      fields: [
        text("pv_dimensions", "Dimensions (L x W x H, mm)", { required: true }),
        num("pv_weight", "Weight (kg per module)", { required: true }),
        text("pv_frame_material", "Frame material / thickness"),
        text("pv_glass_type", "Glass type and thickness"),
        text("pv_junction_box_rating", "Junction box rating (IP)"),
        text("pv_cable_connector", "Cable length and connector type (MC4 compatible yes/no)"),
      ],
    },
    {
      id: "pv_packaging",
      title: "Solar PV Modules - Packaging Hierarchy",
      fields: [
        text("pv_unit", "Unit: 1 module"),
        num("pv_modules_per_carton", "Modules per carton", { required: true }),
        num("pv_cartons_per_pallet", "Cartons per pallet"),
        text("pv_carton_pallet_weight", "Gross/net weight per carton and pallet"),
        text("pv_pallet_dimensions", "Pallet dimensions"),
      ],
    },
    {
      id: "pv_compliance",
      title: "Solar PV Modules - Compliance and Certification",
      fields: [
        text("pv_iec_61215_61730", "IEC 61215 / 61730", { required: true }),
        text("pv_fire_rating", "Fire rating"),
        text("pv_rcm_requirements", "RCM / relevant AU requirements", { required: true }),
        bool("pv_serialisation_traceability", "Serialisation / traceability"),
      ],
    },
    {
      id: "pv_commercial",
      title: "Solar PV Modules - Commercial Terms",
      fields: [
        text("pv_moq", "MOQ (modules / pallet)"),
        text("pv_lead_time", "Lead time (ex-works)"),
        text("pv_warranty", "Warranty (product / performance, years)", { required: true }),
        file("pv_degradation_curve", "Degradation curve upload", { required: true }),
      ],
    },
    {
      id: "pv_logistics",
      title: "Solar PV Modules - Logistics",
      fields: [
        select("pv_shipping_class", "Shipping class", ["Fragile", "Oversized", "Standard"], { required: true }),
        text("pv_stacking_limits", "Stacking limits"),
        text("pv_container_loading", "Container loading profile (20ft / 40ft)"),
      ],
    },
  ],
  "inverters-power-electronics": [
    {
      id: "inverter_identity",
      title: "Inverters and Power Electronics - Product Identity",
      fields: [
        select("inverter_class", "Inverter class", ["String", "Hybrid", "Micro", "Optimiser", "Charge Controller"], {
          required: true,
        }),
        select("inverter_grid_type", "Grid-tied / hybrid / off-grid", ["Grid-tied", "Hybrid", "Off-grid"], {
          required: true,
        }),
        select("inverter_phase", "Phase", ["Single", "Three"], { required: true }),
        text("inverter_firmware_version", "Firmware version"),
      ],
    },
    {
      id: "inverter_electrical",
      title: "Inverters and Power Electronics - Electrical Ratings",
      fields: [
        num("inverter_ac_nominal_power", "AC nominal power (kW)", { required: true }),
        text("inverter_max_dc_input", "Max DC input (V/A)"),
        text("inverter_mppt_count_range", "MPPT count and range"),
        text("inverter_efficiency", "Efficiency (max / EU / CEC)"),
        text("inverter_power_factor_range", "Power factor range"),
      ],
    },
    {
      id: "inverter_mechanical",
      title: "Inverters and Power Electronics - Mechanical and Environmental",
      fields: [
        text("inverter_enclosure_rating", "Enclosure rating (IP)"),
        text("inverter_cooling_method", "Cooling method"),
        text("inverter_operating_temp", "Operating temperature range"),
        text("inverter_dimensions_weight", "Dimensions and weight"),
      ],
    },
    {
      id: "inverter_grid_control",
      title: "Inverters and Power Electronics - Grid and Control",
      fields: [
        text("inverter_grid_standards", "Grid standards supported"),
        text("inverter_anti_islanding", "Anti-islanding compliance"),
        text("inverter_communication_ports", "Communication ports (RS485, CAN, Ethernet, Wi-Fi)"),
        text("inverter_monitoring_compatibility", "Monitoring compatibility"),
      ],
    },
    {
      id: "inverter_packaging",
      title: "Inverters and Power Electronics - Packaging",
      fields: [
        text("inverter_unit_carton_pallet_weights", "Unit / carton / pallet weights"),
        text("inverter_accessories", "Accessories included (CTs, Wi-Fi dongle)"),
      ],
    },
    {
      id: "inverter_compliance",
      title: "Inverters and Power Electronics - Compliance",
      fields: [
        text("inverter_as_nzs_4777", "AS/NZS 4777", { required: true }),
        text("inverter_rcm", "RCM", { required: true }),
        text("inverter_emc_certificates", "EMC certificates"),
      ],
    },
    {
      id: "inverter_commercial",
      title: "Inverters and Power Electronics - Commercial",
      fields: [
        text("inverter_moq", "MOQ"),
        text("inverter_warranty", "Warranty", { required: true }),
        area("inverter_replacement_policy", "Replacement policy"),
      ],
    },
  ],
  "energy-storage-batteries": [
    {
      id: "battery_architecture",
      title: "Energy Storage - Battery Architecture",
      fields: [
        select("battery_chemistry", "Chemistry", ["LiFePO4", "NMC"], { required: true }),
        text("battery_nominal_voltage", "Nominal voltage"),
        text("battery_usable_capacity", "Usable capacity (kWh)", { required: true }),
        text("battery_depth_of_discharge", "Depth of discharge"),
      ],
    },
    {
      id: "battery_electrical_safety",
      title: "Energy Storage - Electrical and Safety",
      fields: [
        text("battery_max_charge_discharge", "Max charge/discharge current"),
        text("battery_short_circuit_protection", "Short-circuit protection"),
        select("battery_bms_type", "BMS type", ["Internal", "External"]),
        text("battery_parallel_stack_limit", "Parallel/stack limit"),
      ],
    },
    {
      id: "battery_mechanical",
      title: "Energy Storage - Mechanical",
      fields: [
        text("battery_mounting_type", "Mounting type"),
        text("battery_dimensions_weight", "Dimensions and weight"),
        text("battery_enclosure_rating", "Enclosure rating"),
      ],
    },
    {
      id: "battery_lifecycle",
      title: "Energy Storage - Lifecycle",
      fields: [
        text("battery_cycle_life", "Cycle life at DoD"),
        text("battery_calendar_life", "Calendar life"),
        file("battery_degradation_curve", "Degradation curve"),
      ],
    },
    {
      id: "battery_compliance",
      title: "Energy Storage - Compliance",
      fields: [
        text("battery_iec_62619", "IEC 62619", { required: true }),
        text("battery_un_38_3", "UN38.3", { required: true }),
        text("battery_transport_classification", "Transport classification"),
      ],
    },
    {
      id: "battery_packaging",
      title: "Energy Storage - Packaging and Transport",
      fields: [
        text("battery_un_packaging", "UN-approved packaging"),
        text("battery_soc_shipping_level", "SOC shipping level"),
        text("battery_palletisation_limits", "Palletisation limits"),
      ],
    },
  ],
  "ev-charging": [
    {
      id: "ev_charger_type",
      title: "EV Charging - Charger Type",
      fields: [
        select("ev_ac_dc", "Charger type", ["AC", "DC"], { required: true }),
        text("ev_output_power", "Output power", { required: true }),
        select("ev_connector_standard", "Connector standard", ["Type 1", "Type 2", "CCS2", "CHAdeMO"], {
          required: true,
        }),
      ],
    },
    {
      id: "ev_electrical",
      title: "EV Charging - Electrical",
      fields: [
        text("ev_input_voltage", "Input voltage"),
        text("ev_max_current", "Max current"),
        text("ev_efficiency", "Efficiency"),
      ],
    },
    {
      id: "ev_control",
      title: "EV Charging - Control and Network",
      fields: [
        text("ev_ocpp_version", "OCPP version"),
        bool("ev_load_balancing", "Load balancing support"),
        text("ev_rfid_app_support", "RFID / app support"),
      ],
    },
    {
      id: "ev_mechanical",
      title: "EV Charging - Mechanical",
      fields: [
        text("ev_mounting", "Mounting (wall / pedestal)"),
        text("ev_ip_rating", "IP rating"),
        text("ev_cable_length", "Cable length"),
      ],
    },
    {
      id: "ev_compliance",
      title: "EV Charging - Compliance",
      fields: [
        text("ev_as_nzs_3000", "AS/NZS 3000 references"),
        text("ev_rcm", "RCM", { required: true }),
        text("ev_electrical_safety", "Electrical safety"),
      ],
    },
  ],
  "mounting-racking": [
    {
      id: "mounting_system_type",
      title: "Mounting and Racking - System Type",
      fields: [
        select("mounting_system_type", "System type", ["Roof", "Ground", "Carport", "Pole"], { required: true }),
        text("mounting_roof_material_compatibility", "Roof material compatibility"),
      ],
    },
    {
      id: "mounting_structural",
      title: "Mounting and Racking - Structural",
      fields: [
        text("mounting_wind_rating", "Wind rating"),
        text("mounting_snow_load", "Snow load (if applicable)"),
        text("mounting_material", "Material (aluminium / steel)"),
      ],
    },
    {
      id: "mounting_compatibility",
      title: "Mounting and Racking - Compatibility",
      fields: [
        text("mounting_module_size_range", "Module size range"),
        text("mounting_rail_profiles", "Rail profiles supported"),
      ],
    },
    {
      id: "mounting_packaging",
      title: "Mounting and Racking - Packaging",
      fields: [
        text("mounting_kit_composition", "Kit composition"),
        text("mounting_fastener_counts", "Fastener counts"),
        text("mounting_carton_breakdown", "Carton breakdown"),
      ],
    },
  ],
  "electrical-bos": [
    {
      id: "bos_component_class",
      title: "Electrical BOS - Component Class",
      fields: [
        text("bos_component_class", "Component class (isolator / cable / connector / conduit)", { required: true }),
      ],
    },
    {
      id: "bos_electrical_ratings",
      title: "Electrical BOS - Electrical Ratings",
      fields: [
        text("bos_voltage", "Voltage (DC/AC)"),
        text("bos_current", "Current"),
        text("bos_insulation_class", "Insulation class"),
      ],
    },
    {
      id: "bos_material",
      title: "Electrical BOS - Material and Construction",
      fields: [
        text("bos_copper_cross_section", "Copper cross-section"),
        text("bos_sheath_material", "Sheath material"),
        text("bos_uv_resistance", "UV resistance"),
      ],
    },
    {
      id: "bos_compliance",
      title: "Electrical BOS - Compliance",
      fields: [
        text("bos_as_nzs_standards", "AS/NZS standards per item"),
        text("bos_fire_rating", "Fire / flame rating"),
      ],
    },
  ],
  "switchgear-protection": [
    {
      id: "switchgear_device_type",
      title: "Switchgear and Protection - Device Type",
      fields: [
        text("switchgear_device_type", "Device type (fuse / breaker / SPD / RCD)", { required: true }),
      ],
    },
    {
      id: "switchgear_electrical",
      title: "Switchgear and Protection - Electrical",
      fields: [
        text("switchgear_rated_voltage_current", "Rated voltage/current"),
        text("switchgear_breaking_capacity", "Breaking capacity"),
        text("switchgear_curve_type", "Curve type"),
      ],
    },
    {
      id: "switchgear_installation",
      title: "Switchgear and Protection - Installation",
      fields: [
        text("switchgear_mounting", "DIN rail / enclosure"),
        text("switchgear_terminal_type", "Terminal type"),
      ],
    },
    {
      id: "switchgear_compliance",
      title: "Switchgear and Protection - Compliance",
      fields: [
        text("switchgear_iec_as_refs", "IEC / AS references"),
      ],
    },
  ],
  "monitoring-control-iot": [
    {
      id: "iot_device_role",
      title: "Monitoring, Control and IoT - Device Role",
      fields: [
        text("iot_device_role", "Device role (logger / gateway / EMS)", { required: true }),
      ],
    },
    {
      id: "iot_data",
      title: "Monitoring, Control and IoT - Data",
      fields: [
        text("iot_sampling_rate", "Sampling rate"),
        text("iot_supported_protocols", "Supported protocols"),
      ],
    },
    {
      id: "iot_connectivity",
      title: "Monitoring, Control and IoT - Connectivity",
      fields: [
        text("iot_connectivity", "Connectivity (Ethernet / Wi-Fi / LTE)"),
        text("iot_cloud_regions", "Cloud regions supported"),
      ],
    },
    {
      id: "iot_security",
      title: "Monitoring, Control and IoT - Security",
      fields: [
        text("iot_encryption_standard", "Encryption standard"),
        text("iot_update_mechanism", "Update mechanism"),
      ],
    },
  ],
  "off-grid-hybrid-accessories": [
    {
      id: "offgrid_role",
      title: "Off-Grid and Hybrid Accessories - Functional Role",
      fields: [
        text("offgrid_functional_role", "Functional role", { required: true }),
      ],
    },
    {
      id: "offgrid_electrical",
      title: "Off-Grid and Hybrid Accessories - Electrical",
      fields: [
        text("offgrid_switching_capacity", "Switching capacity"),
        text("offgrid_response_time", "Response time"),
      ],
    },
    {
      id: "offgrid_integration",
      title: "Off-Grid and Hybrid Accessories - Integration",
      fields: [
        area("offgrid_inverter_compatibility", "Inverter compatibility list"),
      ],
    },
  ],
  "solar-thermal-heat-pumps": [
    {
      id: "thermal_output",
      title: "Solar Thermal and Heat Pumps - Thermal Output",
      fields: [
        text("thermal_output_kw", "Rated kW"),
        text("thermal_cop", "COP"),
      ],
    },
    {
      id: "thermal_hydraulic",
      title: "Solar Thermal and Heat Pumps - Hydraulic",
      fields: [
        text("thermal_flow_rate", "Flow rate"),
        text("thermal_pressure_rating", "Pressure rating"),
      ],
    },
    {
      id: "thermal_compliance",
      title: "Solar Thermal and Heat Pumps - Compliance",
      fields: [
        text("thermal_watermark", "WaterMark"),
        text("thermal_energy_labelling", "Energy labelling"),
      ],
    },
  ],
  "hvac-load-efficiency": [
    {
      id: "hvac_control",
      title: "HVAC and Load-Side Efficiency - Control",
      fields: [
        text("hvac_control_type", "Control type"),
        text("hvac_load_capacity", "Load capacity"),
        text("hvac_control_logic", "Control logic"),
      ],
    },
  ],
  "tools-test-ppe": [
    {
      id: "tools_class",
      title: "Tools, Test and PPE - Tool Class",
      fields: [
        text("tools_class", "Tool class", { required: true }),
      ],
    },
    {
      id: "tools_rating",
      title: "Tools, Test and PPE - Rating",
      fields: [
        text("tools_voltage_class", "Voltage class"),
        text("tools_cat_rating", "CAT rating (for test gear)"),
      ],
    },
    {
      id: "tools_certification",
      title: "Tools, Test and PPE - Certification",
      fields: [
        text("tools_calibration_certificates", "Calibration certificates"),
      ],
    },
  ],
  "labels-compliance-documentation": [
    {
      id: "labels_document_type",
      title: "Labels, Compliance and Documentation - Document Type",
      fields: [
        text("labels_document_type", "Label / diagram / form", { required: true }),
      ],
    },
    {
      id: "labels_standard_reference",
      title: "Labels, Compliance and Documentation - Standard Reference",
      fields: [
        text("labels_clause_mapping", "Clause mapping"),
      ],
    },
    {
      id: "labels_format",
      title: "Labels, Compliance and Documentation - Format",
      fields: [
        text("labels_format", "Physical / digital"),
        text("labels_language_versions", "Language versions"),
      ],
    },
  ],
  "packaging-spares-consumables": [
    {
      id: "spares_item_type",
      title: "Packaging, Spares and Consumables - Item Type",
      fields: [
        text("spares_item_type", "Fastener / sealant / spare", { required: true }),
      ],
    },
    {
      id: "spares_material",
      title: "Packaging, Spares and Consumables - Material",
      fields: [
        text("spares_material_grade", "Material grade / coating"),
      ],
    },
    {
      id: "spares_shelf_life",
      title: "Packaging, Spares and Consumables - Shelf Life",
      fields: [
        text("spares_expiry", "Expiry (if applicable)"),
      ],
    },
  ],
  "other-emerging-technologies": [
    {
      id: "emerging_classification",
      title: "Other Emerging Technologies - Technology Classification",
      fields: [
        text("emerging_classification", "Technology classification", { required: true }),
      ],
    },
    {
      id: "emerging_performance",
      title: "Other Emerging Technologies - Performance Metrics",
      fields: [
        area("emerging_performance_metrics", "Category-specific KPIs"),
      ],
    },
    {
      id: "emerging_risk",
      title: "Other Emerging Technologies - Risk and Compliance",
      fields: [
        text("emerging_hazard_class", "Hazard class"),
        text("emerging_regulatory_pathway", "Regulatory pathway"),
      ],
    },
    {
      id: "emerging_lifecycle",
      title: "Other Emerging Technologies - Lifecycle and Support",
      fields: [
        text("emerging_firmware_consumables", "Firmware / consumables"),
        text("emerging_end_of_life_handling", "End-of-life handling"),
      ],
    },
  ],
};

export function getProductFormSections(categorySlug: string): FormSection[] {
  return [...masterSections, ...(categorySectionsBySlug[categorySlug] || [])];
}

export function getMasterSections(): FormSection[] {
  return masterSections;
}
