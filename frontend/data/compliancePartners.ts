export type CertificationType = "CEC" | "RCM" | "EESS" | "GEMS" | "STRUCTURAL" | "ISO";

export type CompliancePartnerOffice = {
  city: string;
  state?: string;
  country: "AU" | "NZ";
  label?: string;
  addressLine?: string;
  postcode?: string;
  sourceUrl?: string;
  isPrimary?: boolean;
  isNearestToBrisbane?: boolean;
};

export interface CompliancePartner {
  id: string;
  name: string;
  certifications: CertificationType[];
  slaDays: number;
  location: string;
  status: "Available" | "Limited" | "Busy";
  focusCategories?: string[];
  notes?: string;
  websiteUrl?: string;
  offices?: CompliancePartnerOffice[];
}

export const compliancePartners: CompliancePartner[] = [
  {
    id: "cp-cba",
    name: "Certification Body Australia (CBA)",
    certifications: ["RCM", "EESS", "GEMS", "STRUCTURAL"],
    slaDays: 8,
    location: "Sydney, AU",
    status: "Available",
    focusCategories: ["mounting-racking", "switchgear-protection"],
    websiteUrl: "https://certificationbody.com.au/",
    offices: [{ city: "Sydney", state: "NSW", country: "AU", label: "Sydney", isPrimary: true }],
  },
  {
    id: "cp-eess-ccs",
    name: "EESS Conformity Certification Services (CCS)",
    certifications: ["EESS", "RCM", "GEMS"],
    slaDays: 7,
    location: "Melbourne, AU",
    status: "Available",
    focusCategories: ["switchgear-protection", "monitoring-control-iot"],
    offices: [{ city: "Melbourne", state: "VIC", country: "AU", label: "Melbourne", isPrimary: true }],
  },
  {
    id: "cp-global-mark",
    name: "Global-Mark Pty Ltd",
    certifications: ["RCM", "EESS", "GEMS"],
    slaDays: 9,
    location: "North Ryde, AU",
    status: "Available",
    focusCategories: ["energy-storage-batteries", "ev-charging"],
    websiteUrl: "https://www.global-mark.com.au/",
    offices: [
      {
        city: "North Ryde",
        state: "NSW",
        country: "AU",
        label: "North Ryde",
        addressLine: "Suite 4.07, 32 Delhi Road",
        postcode: "2113",
        sourceUrl: "https://ncc.abcb.gov.au/portal/certifier/global-mark-pty-ltd",
        isPrimary: true,
        isNearestToBrisbane: true,
      },
    ],
  },
  {
    id: "cp-citation-group",
    name: "Citation Group",
    certifications: ["ISO"],
    slaDays: 12,
    location: "Brisbane, AU",
    status: "Available",
    focusCategories: ["supplier-governance", "quality-systems"],
    websiteUrl: "https://citationgroup.com.au/iso-certification/",
    offices: [
      {
        city: "Brisbane",
        state: "QLD",
        country: "AU",
        label: "Brisbane",
        addressLine: "Level 12, 300 Ann St",
        postcode: "4000",
        sourceUrl: "https://training.citationgroup.com.au/citation-certification-contact",
        isPrimary: true,
      },
    ],
  },
  {
    id: "cp-ul-nz",
    name: "UL Solutions ANZ",
    certifications: ["RCM", "EESS", "GEMS"],
    slaDays: 10,
    location: "Melbourne, AU",
    status: "Limited",
    focusCategories: ["energy-storage-batteries", "ev-charging"],
    websiteUrl: "https://www.ul.com/contact/",
    offices: [
      {
        city: "Melbourne",
        state: "VIC",
        country: "AU",
        label: "Melbourne",
        addressLine: "Level 7, 277 William St",
        postcode: "3000",
        sourceUrl: "https://www.ul.com/contact/",
        isPrimary: true,
        isNearestToBrisbane: true,
      },
      {
        city: "Auckland",
        country: "NZ",
        label: "Auckland",
        addressLine: "54 Tarndale Grove, Albany",
        postcode: "0632",
        sourceUrl: "https://au-nz.ul.com/about/locations",
      },
    ],
  },
  {
    id: "cp-saa-approvals",
    name: "SAA Approvals Pty Ltd",
    certifications: ["RCM", "EESS"],
    slaDays: 8,
    location: "Brisbane (Murarrie), AU",
    status: "Available",
    focusCategories: ["inverters-power-electronics", "ev-charging"],
    websiteUrl: "https://www.saaapprovals.com.au/contact-us/",
    offices: [
      {
        city: "Brisbane",
        state: "QLD",
        country: "AU",
        label: "Murarrie",
        addressLine: "Unit 5, 20 Rivergate Place",
        postcode: "4172",
        sourceUrl: "https://www.saaapprovals.com.au/contact-us/",
        isPrimary: true,
      },
    ],
  },
  {
    id: "cp-oz-cert",
    name: "Oz Cert Pty Ltd (Oz Cert)",
    certifications: ["RCM", "EESS", "GEMS"],
    slaDays: 11,
    location: "Brisbane (Cleveland), AU",
    status: "Limited",
    focusCategories: ["solar-pv-modules", "mounting-racking"],
    websiteUrl: "https://www.ozcert.com.au/contact-us/contact-details/",
    offices: [
      {
        city: "Brisbane",
        state: "QLD",
        country: "AU",
        label: "Cleveland",
        addressLine: "15/23 Middle Street",
        postcode: "4163",
        sourceUrl: "https://www.ozcert.com.au/contact-us/contact-details/",
        isPrimary: true,
      },
    ],
  },
  {
    id: "cp-sgs-au",
    name: "SGS Australia Pty Ltd",
    certifications: ["CEC", "RCM", "EESS", "GEMS", "STRUCTURAL"],
    slaDays: 9,
    location: "Brisbane (Milton), AU",
    status: "Available",
    focusCategories: ["solar-pv-modules", "inverters-power-electronics", "energy-storage-batteries"],
    websiteUrl: "https://www.sgs.com/en-au",
    offices: [
      {
        city: "Brisbane",
        state: "QLD",
        country: "AU",
        label: "Milton",
        addressLine: "27 Mayneview Street",
        postcode: "4064",
        sourceUrl: "https://www.sgs.com/tr/-/media/sgscorp/documents/corporate/brochures/sgs-ind-address-booklet-en-12.cdn.tr.pdf",
        isPrimary: true,
      },
      { city: "Sydney", state: "NSW", country: "AU", label: "Sydney" },
    ],
  },
  {
    id: "cp-tuv-au",
    name: "TUV Rheinland Australia Pty Ltd",
    certifications: ["CEC", "RCM", "EESS", "GEMS"],
    slaDays: 9,
    location: "Heidelberg West, AU",
    status: "Available",
    focusCategories: ["solar-pv-modules", "inverters-power-electronics"],
    websiteUrl: "https://www.tuv.com/australia/en/",
    offices: [
      {
        city: "Heidelberg West",
        state: "VIC",
        country: "AU",
        label: "Heidelberg West",
        addressLine: "182 Dougharty Road",
        postcode: "3081",
        sourceUrl: "https://www.tuv.com/australia/en/locationfinder/location-detail-page_44565.html",
        isPrimary: true,
      },
      {
        city: "Tomago",
        state: "NSW",
        country: "AU",
        label: "Tomago",
        addressLine: "30 Kennington Drive",
        postcode: "2322",
        sourceUrl: "https://www.tuv.com/australia/en/locationfinder/location-detail-page_44199.html",
        isNearestToBrisbane: true,
      },
    ],
  },
];
