import PublicContactForm from "./PublicContactForm";
import TrustBlock from "./TrustBlock";

export default function PublicSiteLayout({ data, entityType, slug }: { data: any; entityType: string; slug: string }) {
  const content = data?.contentJSON || {};
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: content?.homepage?.title || slug,
    description: content?.homepage?.subtitle || "",
    url:
      entityType === "SUPPLIER"
        ? `/suppliers/${slug}`
        : entityType === "INSTALLER"
          ? `/installers/${slug}`
          : entityType === "CERTIFIER"
            ? `/certifiers/${slug}`
            : `/insurance/${slug}`,
    sameAs: [],
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <div className="rounded-2xl border p-5">
            <div className="text-2xl font-bold">{content?.homepage?.title || slug}</div>
            <div className="mt-2 text-sm text-gray-600">{content?.homepage?.subtitle || ""}</div>
            <div className="mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold">Status: ACTIVE</div>
          </div>

          <div className="mt-6 rounded-2xl border p-5">
            <div className="text-sm font-semibold">Overview</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
              {content?.homepage?.overview || "No overview provided."}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border p-5">
            <div className="text-sm font-semibold">Products / Services</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
              {content?.products?.summary || content?.services?.summary || "No details provided."}
            </div>
          </div>

          {content?.warranty ? (
            <div className="mt-6 rounded-2xl border p-5">
              <div className="text-sm font-semibold">Warranty</div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                {content?.warranty?.summary || "No warranty summary provided."}
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl border p-5">
            <div className="text-sm font-semibold">Terms & Conditions</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
              {content?.terms?.summary || "No terms summary provided."}
            </div>
          </div>
        </div>

        <div className="w-full space-y-6 lg:w-[360px]">
          <TrustBlock trust={data?.trust} />
          <PublicContactForm entityType={entityType} slug={slug} />
        </div>
      </div>
    </div>
  );
}
