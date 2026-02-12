import { notFound } from "next/navigation";
import PublicSiteLayout from "./PublicSiteLayout";
import { mapEntityPathToType, getPublishedBySlug } from "../../lib/public-sites/services/PublicSiteService";

export default function PublicSitePage({ entityType, slug, unavailableTitle }: { entityType: string; slug: string; unavailableTitle: string }) {
  const resolvedType = mapEntityPathToType(entityType);
  const data: any = getPublishedBySlug({ entityType: resolvedType, slug: String(slug || "").toLowerCase() });

  if (!data) return notFound();

  if (data.suspended) {
    return (
      <div className="mx-auto max-w-3xl p-10">
        <div className="text-2xl font-bold">{unavailableTitle}</div>
        <div className="mt-2 text-sm text-gray-600">This participant is not currently published.</div>
      </div>
    );
  }

  return (
    <PublicSiteLayout
      data={{
        contentJSON: data.snapshot.contentJSON,
        trust: {
          approvalStatus: data.profile.approvalStatus,
          certificationStatus: data.profile.certificationStatus,
          insuranceStatus: data.profile.insuranceStatus,
          badges: data.profile.verificationBadges,
        },
      }}
      entityType={resolvedType}
      slug={String(slug || "").toLowerCase()}
    />
  );
}
