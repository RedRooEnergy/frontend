import PublicSitePage from "../../../components/publicSites/PublicSitePage";
import type { Metadata } from "next";
import { getPublishedBySlug } from "../../../lib/public-sites/services/PublicSiteService";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const data: any = getPublishedBySlug({ entityType: "CERTIFIER", slug: params.slug.toLowerCase() });
  if (!data || data.suspended) {
    return { title: "Certifier unavailable" };
  }
  const title = data.snapshot?.seoMeta?.title || data.snapshot?.contentJSON?.homepage?.title || params.slug;
  const description = data.snapshot?.seoMeta?.description || data.snapshot?.contentJSON?.homepage?.subtitle || "";
  return {
    title,
    description,
    alternates: { canonical: `/certifiers/${params.slug.toLowerCase()}` },
    openGraph: {
      title,
      description,
      url: `/certifiers/${params.slug.toLowerCase()}`,
    },
  };
}

export default function CertifierPublicSitePage({ params }: { params: { slug: string } }) {
  return <PublicSitePage entityType="CERTIFIER" slug={params.slug} unavailableTitle="Certifier page unavailable" />;
}
