import PublicSitePage from "../../../components/publicSites/PublicSitePage";
import type { Metadata } from "next";
import { getPublishedBySlug } from "../../../lib/public-sites/services/PublicSiteService";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const data: any = getPublishedBySlug({ entityType: "INSURANCE", slug: params.slug.toLowerCase() });
  if (!data || data.suspended) {
    return { title: "Insurance profile unavailable" };
  }
  const title = data.snapshot?.seoMeta?.title || data.snapshot?.contentJSON?.homepage?.title || params.slug;
  const description = data.snapshot?.seoMeta?.description || data.snapshot?.contentJSON?.homepage?.subtitle || "";
  return {
    title,
    description,
    alternates: { canonical: `/insurance/${params.slug.toLowerCase()}` },
    openGraph: {
      title,
      description,
      url: `/insurance/${params.slug.toLowerCase()}`,
    },
  };
}

export default function InsurancePublicSitePage({ params }: { params: { slug: string } }) {
  return <PublicSitePage entityType="INSURANCE" slug={params.slug} unavailableTitle="Insurance page unavailable" />;
}
