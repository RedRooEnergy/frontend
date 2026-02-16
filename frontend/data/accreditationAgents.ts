export type AccreditationAgent = {
  code: string;
  name: string;
  websiteUrl: string;
  summary: {
    en: string;
    zh: string;
  };
};

export const accreditationAgents: AccreditationAgent[] = [
  {
    code: "TUV",
    name: "TÜV Rheinland Australia",
    websiteUrl: "https://www.tuv.com/australia/en/",
    summary: {
      en: "Global testing and certification group with deep AU/NZ renewable energy expertise. Strong for inverters, storage systems, and complex PV products.",
      zh: "全球检测认证机构，澳洲/新西兰新能源经验丰富。适合逆变器、储能系统和复杂光伏产品。",
    },
  },
  {
    code: "SGS",
    name: "SGS Australia",
    websiteUrl: "https://www.sgs.com/en-au",
    summary: {
      en: "Broad electrical safety testing and certification with strong local acceptance across standard PV and electrical products.",
      zh: "电气安全测试与认证范围广，澳洲认可度高，适合标准光伏与电气产品。",
    },
  },
  {
    code: "UL",
    name: "UL Solutions ANZ",
    websiteUrl: "https://www.ul.com/contact/",
    summary: {
      en: "Global leader in battery safety and EV charger testing. Strong for storage systems and EVSE.",
      zh: "电池安全与EV充电测试领先机构，适合储能系统和充电设备。",
    },
  },
  {
    code: "SAA",
    name: "SAA Approvals Pty Ltd",
    websiteUrl: "https://www.saaapprovals.com.au/contact-us/",
    summary: {
      en: "Australian electrical certification body. Good for isolators, switchgear, and common electrical approvals.",
      zh: "澳洲本地电气认证机构，适合隔离开关、开关保护等电气产品认证。",
    },
  },
  {
    code: "OZCERT",
    name: "Oz Cert Pty Ltd",
    websiteUrl: "https://www.ozcert.com.au/contact-us/contact-details/",
    summary: {
      en: "Australian electrical product safety certification. Suitable for standard electrical components and accessories.",
      zh: "澳洲电气产品安全认证机构，适合常见电气组件与配件。",
    },
  },
  {
    code: "CBA",
    name: "Certification Body Australia (CBA)",
    websiteUrl: "https://certificationbody.com.au/",
    summary: {
      en: "Australian certification body suited to electrical and mixed electrical/communications products.",
      zh: "适合电气及电气+通信类产品的澳洲认证机构。",
    },
  },
  {
    code: "GLOBALMARK",
    name: "Global-Mark Pty Ltd",
    websiteUrl: "https://www.global-mark.com.au/contact/",
    summary: {
      en: "ISO management system certifications (company-level). Not a product test laboratory.",
      zh: "ISO管理体系认证（公司级），不是产品测试机构。",
    },
  },
  {
    code: "CITATION",
    name: "Citation Group",
    websiteUrl: "https://citationgroup.com.au/iso-certification/",
    summary: {
      en: "ISO management system certifications (company-level). Not a product test laboratory.",
      zh: "ISO管理体系认证（公司级），不是产品测试机构。",
    },
  },
];

export function getAccreditationAgentByCode(code: string) {
  return accreditationAgents.find((agent) => agent.code === code) || null;
}
