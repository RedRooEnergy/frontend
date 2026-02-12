export default function TrustBlock({ trust }: { trust: any }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm font-semibold">Trust & Verification</div>
      <div className="mt-2 text-sm">
        <div>
          Approval: <span className="font-medium">{trust?.approvalStatus || "UNKNOWN"}</span>
        </div>
        <div>
          Certification: <span className="font-medium">{trust?.certificationStatus || "UNKNOWN"}</span>
        </div>
        <div>
          Insurance: <span className="font-medium">{trust?.insuranceStatus || "UNKNOWN"}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {trust?.badges?.rreVerified ? <span className="rounded-full border px-2 py-1">RRE Verified</span> : null}
        {trust?.badges?.complianceVerified ? <span className="rounded-full border px-2 py-1">Compliance Verified</span> : null}
        {trust?.badges?.insuranceVerified ? <span className="rounded-full border px-2 py-1">Insurance Verified</span> : null}
      </div>
      <div className="mt-3 text-xs text-gray-500">Verified indicators reflect current marketplace verification state.</div>
    </div>
  );
}
