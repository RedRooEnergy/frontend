export type CatalogueDownload = {
  title: string;
  description: string;
  format: "PDF" | "JSON" | "EVIDENCE";
  href: string;
};

export type CatalogueManifestSummary = {
  weekId: string;
  hash: string;
  generatedAt: string;
  publishedAt: string;
  itemCount: number;
  sectionCount: number;
  downloads: CatalogueDownload[];
};

export const latestCatalogueManifest: CatalogueManifestSummary = {
  weekId: "2026-06",
  hash: "sha256:9f2c8d3b7c4a1e6f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f",
  generatedAt: "2026-02-03T00:05:00Z",
  publishedAt: "2026-02-03T00:10:00Z",
  itemCount: 482,
  sectionCount: 7,
  downloads: [
    {
      title: "Buyer Catalogue (PDF)",
      description: "Readable catalogue for procurement review and sharing.",
      format: "PDF",
      href: "/catalogue/download?format=pdf",
    },
    {
      title: "Structured Catalogue (JSON)",
      description: "Structured export for internal systems and analysis.",
      format: "JSON",
      href: "/catalogue/download?format=json",
    },
    {
      title: "Evidence Pack (Regulator)",
      description: "Hash-linked export for audit and compliance review.",
      format: "EVIDENCE",
      href: "/catalogue/download?format=evidence",
    },
  ],
};
