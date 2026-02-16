const panels = [
  {
    label: "Buyer",
    description: "",
    href: "/buyers",
    image: "/placeholders/2._placeholder_buyer.png",
    footerText:
      "Freight & Duty (DDP). Procure compliant energy equipment through a governed marketplace delivering transparency, documentation certainty, disciplined logistics, and accountable delivery for Australian buyers.",
  },
  {
    label: "Supplier",
    description: "",
    href: "/suppliers",
    image: "/placeholders/3._placeholders_supplier.png",
    footerText:
      "Publish compliant energy products through a governed marketplace with clear logistics, documentation standards, accountable fulfilment, and predictable commercial outcomes globally.",
  },
  {
    label: "Service Partner",
    description: "",
    href: "/service-partners",
    image: "/placeholders/4._placeholder_cert.png",
    footerText:
      "Deliver installation, compliance, and logistics services within a governed marketplace, with defined scopes, evidence standards, safety obligations, and accountable outcomes.",
  },
  {
    label: "Freight & Duty (DDP)",
    description:
      "Clear delivered-duty-paid handling, defined responsibilities, compliant documentation, and reliable end-to-end delivery.",
    href: "/freight-duty",
    image: "/placeholders/1._placeholder_ddp.png",
  },
];

export default function CategoryPanel() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-4 mt-neg-280">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {panels.map((panel) => (
          <div
            key={panel.label}
            className="category-card bg-surface rounded-2xl shadow-card p-4 flex flex-col gap-3 hover:shadow-card transition text-center"
          >
            <Image
              src={panel.image}
              alt={`${panel.label} overview`}
              width={260}
              height={180}
              className="category-card-image"
              sizes="(min-width: 768px) 240px, 100vw"
            />
            <div className="category-card-text">
              <h3 className="category-card-copy">{panel.label}</h3>
              {panel.description ? <p className="category-card-copy">{panel.description}</p> : null}
              {panel.footerText ? (
                <p className="category-card-copy mt-2">{panel.footerText}</p>
              ) : null}
            </div>
            <a
              href={panel.href}
              className="category-card-button inline-block px-4 py-2 bg-brand-700 text-brand-100 rounded-full text-xs font-semibold"
            >
              Find Out More
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
import Image from "next/image";
