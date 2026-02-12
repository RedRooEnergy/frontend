import PublicSitePage from "../../../components/publicSites/PublicSitePage";
import type { Metadata } from "next";
import { getPublishedBySlug } from "../../../lib/public-sites/services/PublicSiteService";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const data: any = getPublishedBySlug({ entityType: "INSTALLER", slug: params.slug.toLowerCase() });
  if (!data || data.suspended) {
    return { title: "Installer unavailable" };
  }
  const title = data.snapshot?.seoMeta?.title || data.snapshot?.contentJSON?.homepage?.title || params.slug;
  const description = data.snapshot?.seoMeta?.description || data.snapshot?.contentJSON?.homepage?.subtitle || "";
  return {
    title,
    description,
    alternates: { canonical: `/installers/${params.slug.toLowerCase()}` },
    openGraph: {
      title,
      description,
      url: `/installers/${params.slug.toLowerCase()}`,
    },
  };
}

export default function InstallerPublicSitePage({ params }: { params: { slug: string } }) {
  return <PublicSitePage entityType="INSTALLER" slug={params.slug} unavailableTitle="Installer page unavailable" />;
}
