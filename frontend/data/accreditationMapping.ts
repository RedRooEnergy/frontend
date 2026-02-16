import { accreditationAgents, getAccreditationAgentByCode } from "./accreditationAgents";

export type AccreditationRecommendation = {
  categorySlug: string;
  subCategorySlug: string;
  agentCodes: string[];
  reason: {
    en: string;
    zh: string;
  };
};

const RECOMMENDATIONS: AccreditationRecommendation[] = [
  {
    categorySlug: "solar-pv-modules",
    subCategorySlug: "building-integrated-bipv",
    agentCodes: ["TUV"],
    reason: {
      en: "BIPV products are more complex; TÜV handles non-standard PV compliance well.",
      zh: "BIPV更复杂，TÜV擅长非标准光伏合规。",
    },
  },
  {
    categorySlug: "solar-pv-modules",
    subCategorySlug: "flexible",
    agentCodes: ["TUV"],
    reason: {
      en: "Flexible modules often need deeper structural and safety testing.",
      zh: "柔性组件需要更深入的结构与安全测试。",
    },
  },
  {
    categorySlug: "solar-pv-modules",
    subCategorySlug: "*",
    agentCodes: ["SGS"],
    reason: {
      en: "Standard PV modules are commonly certified through SGS in Australia.",
      zh: "标准光伏组件在澳洲常用SGS认证。",
    },
  },
  {
    categorySlug: "inverters-power-electronics",
    subCategorySlug: "string-inverters",
    agentCodes: ["TUV"],
    reason: {
      en: "String inverters require strong AU/NZ grid compliance testing.",
      zh: "串式逆变器需要严格的澳洲并网合规测试。",
    },
  },
  {
    categorySlug: "inverters-power-electronics",
    subCategorySlug: "hybrid-inverters",
    agentCodes: ["TUV"],
    reason: {
      en: "Hybrid inverters combine battery + grid functions; TÜV is well suited.",
      zh: "混合逆变器涉及电池+并网功能，TÜV更合适。",
    },
  },
  {
    categorySlug: "inverters-power-electronics",
    subCategorySlug: "microinverters",
    agentCodes: ["SGS"],
    reason: {
      en: "Microinverters follow standard electrical safety pathways.",
      zh: "微型逆变器走标准电气安全认证路径。",
    },
  },
  {
    categorySlug: "inverters-power-electronics",
    subCategorySlug: "dc-optimisers",
    agentCodes: ["SGS"],
    reason: {
      en: "DC optimisers align to standard BOS electrical approvals.",
      zh: "DC优化器符合常规电气组件认证。",
    },
  },
  {
    categorySlug: "inverters-power-electronics",
    subCategorySlug: "charge-controllers",
    agentCodes: ["SGS"],
    reason: {
      en: "Charge controllers follow common electrical safety standards.",
      zh: "充电控制器适用于常见电气安全标准。",
    },
  },
  {
    categorySlug: "inverters-power-electronics",
    subCategorySlug: "*",
    agentCodes: ["TUV"],
    reason: {
      en: "Default recommendation for inverter-class power electronics.",
      zh: "逆变器类电力电子默认推荐。",
    },
  },
  {
    categorySlug: "energy-storage-batteries",
    subCategorySlug: "wall-mounted-lifepo4",
    agentCodes: ["TUV", "UL"],
    reason: {
      en: "Residential batteries need strong safety testing; UL is a global leader.",
      zh: "家用电池需要严格安全测试，UL是全球领先。",
    },
  },
  {
    categorySlug: "energy-storage-batteries",
    subCategorySlug: "*",
    agentCodes: ["UL"],
    reason: {
      en: "Battery packs and ESS systems are best aligned with UL testing.",
      zh: "电池包与储能系统最适合UL测试。",
    },
  },
  {
    categorySlug: "ev-charging",
    subCategorySlug: "ac-wallboxes",
    agentCodes: ["UL"],
    reason: {
      en: "AC chargers require EVSE safety certification; UL is strongest.",
      zh: "AC充电器需要EVSE安全认证，UL最强。",
    },
  },
  {
    categorySlug: "ev-charging",
    subCategorySlug: "dc-fast-chargers",
    agentCodes: ["UL"],
    reason: {
      en: "High-power DC chargers require advanced safety testing.",
      zh: "大功率直流充电需要高级安全测试。",
    },
  },
  {
    categorySlug: "ev-charging",
    subCategorySlug: "portable-evse",
    agentCodes: ["SGS"],
    reason: {
      en: "Portable EVSE aligns with standard consumer electrical pathways.",
      zh: "便携EVSE符合常规电气产品认证。",
    },
  },
  {
    categorySlug: "ev-charging",
    subCategorySlug: "cables-adapters",
    agentCodes: ["SGS"],
    reason: {
      en: "Cables/adapters typically follow standard electrical approvals.",
      zh: "线缆/适配器通常走标准电气认证。",
    },
  },
  {
    categorySlug: "ev-charging",
    subCategorySlug: "load-balancing-hubs",
    agentCodes: ["SGS"],
    reason: {
      en: "Load-balancing hubs align with standard electrical testing.",
      zh: "负载均衡设备适合标准电气测试。",
    },
  },
  {
    categorySlug: "ev-charging",
    subCategorySlug: "*",
    agentCodes: ["UL"],
    reason: {
      en: "Default recommendation for EV charging equipment.",
      zh: "EV充电设备默认推荐。",
    },
  },
  {
    categorySlug: "mounting-racking",
    subCategorySlug: "*",
    agentCodes: ["CBA"],
    reason: {
      en: "Mounting systems often need local structural compliance support.",
      zh: "支架系统通常需要本地结构合规支持。",
    },
  },
  {
    categorySlug: "electrical-bos",
    subCategorySlug: "dc-isolators",
    agentCodes: ["SAA"],
    reason: {
      en: "DC isolators are a common SAA approvals pathway.",
      zh: "直流隔离开关通常走SAA认证。",
    },
  },
  {
    categorySlug: "electrical-bos",
    subCategorySlug: "ac-isolators",
    agentCodes: ["SAA"],
    reason: {
      en: "AC isolators align to standard SAA electrical approvals.",
      zh: "交流隔离开关适合SAA电气认证。",
    },
  },
  {
    categorySlug: "electrical-bos",
    subCategorySlug: "switch-fuse-boxes",
    agentCodes: ["SAA"],
    reason: {
      en: "Switch/fuse boxes typically follow local approvals via SAA.",
      zh: "开关/熔断箱通常使用SAA本地认证。",
    },
  },
  {
    categorySlug: "electrical-bos",
    subCategorySlug: "*",
    agentCodes: ["SAA", "OZCERT"],
    reason: {
      en: "Electrical BOS components require local electrical approvals.",
      zh: "电气BOS组件需要本地电气认证。",
    },
  },
  {
    categorySlug: "switchgear-protection",
    subCategorySlug: "*",
    agentCodes: ["SAA"],
    reason: {
      en: "Switchgear and protection devices align to local SAA approvals.",
      zh: "开关保护设备适合SAA本地认证。",
    },
  },
  {
    categorySlug: "monitoring-control-iot",
    subCategorySlug: "*",
    agentCodes: ["CBA"],
    reason: {
      en: "Monitoring/IoT devices often combine electrical + communications compliance.",
      zh: "监测/物联网设备通常涉及电气+通信合规。",
    },
  },
  {
    categorySlug: "off-grid-hybrid-accessories",
    subCategorySlug: "*",
    agentCodes: ["SGS"],
    reason: {
      en: "Off-grid accessories follow standard electrical safety pathways.",
      zh: "离网附件适合标准电气安全认证。",
    },
  },
  {
    categorySlug: "solar-thermal-heat-pumps",
    subCategorySlug: "*",
    agentCodes: ["SGS"],
    reason: {
      en: "Thermal/heat pump products benefit from broad SGS testing support.",
      zh: "热能/热泵产品适合SGS综合测试支持。",
    },
  },
];

export function getAccreditationRecommendations(categorySlug?: string, subCategorySlug?: string) {
  if (!categorySlug) return [];
  const exact = RECOMMENDATIONS.find(
    (item) => item.categorySlug === categorySlug && item.subCategorySlug === (subCategorySlug || "")
  );
  const fallback = RECOMMENDATIONS.find(
    (item) => item.categorySlug === categorySlug && item.subCategorySlug === "*"
  );
  const match = exact || fallback;
  if (!match) return [];

  return match.agentCodes
    .map((code) => {
      const agent = getAccreditationAgentByCode(code);
      if (!agent) return null;
      return {
        agent,
        reason: match.reason,
      };
    })
    .filter(Boolean) as { agent: typeof accreditationAgents[number]; reason: AccreditationRecommendation["reason"] }[];
}

export const accreditationRecommendations = RECOMMENDATIONS;
