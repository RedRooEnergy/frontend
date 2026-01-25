export default function CompliancePage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Compliance & Trust</h2>
      <p className="text-slate-300 max-w-3xl">
        Compliance is enforced before shipment, not after. Evidence is preserved immutably, and audit logs cannot be altered or
        deleted. UI surfaces compliance status; decisions remain on the server.
      </p>
      <ul className="list-disc list-inside text-slate-300 space-y-1">
        <li>Compliance checks block progression until satisfied.</li>
        <li>Evidence and audit entries are append-only.</li>
        <li>Suppliers see status; approvals are never implied by uploads.</li>
      </ul>
    </section>
  );
}
