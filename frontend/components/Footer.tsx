import Link from "next/link";
import Image from "next/image";
import { footerNavigation } from "./footerNavigation";

export default function Footer() {
  const shareUrl = "https://redrooenergy.com";
  const shareTitle = "RedRooEnergy Marketplace";
  const iconColors = {
    linkedin: "#0A66C2",
    youtube: "#FF0000",
    wechat: "#1AAD19",
    whatsapp: "#25D366",
    facebook: "#1877F2",
    email: "#0F8F9B",
  };
  const governmentLogos: Array<{
    label: string;
    href: string;
    src: string;
    imgStyle?: React.CSSProperties;
  }> = [
    {
      label: "Clean Energy Council",
      href: "https://cleanenergycouncil.org.au/",
      src: "/icons/clean-energy-council-logo.png",
    },
    {
      label: "Solar Accreditation Australia",
      href: "https://saaustralia.com.au/",
      src: "/icons/solar-accreditation-australia-logo.png",
    },
    {
      label: "Electrical Equipment Safety System",
      href: "https://www.eess.gov.au/",
      src: "/icons/eess-logo.png",
    },
    {
      label: "TUV Rheinland",
      href: "https://www.tuv.com/australia/en/",
      src: "/icons/tuv-logo.svg",
    },
    {
      label: "Citation Group",
      href: "https://citationgroup.com.au/iso-certification/",
      src: "/icons/citation-group-logo.svg",
    },
    {
      label: "Oz Cert",
      href: "https://www.ozcert.com.au/",
      src: "/icons/ozcert-logo.png",
    },
    {
      label: "SAA Approvals",
      href: "https://www.saaapprovals.com.au/",
      src: "/icons/saa-approvals-logo.png",
    },
    {
      label: "UL Solutions",
      href: "https://au-nz.ul.com/",
      src: "/icons/ul-logo.svg",
    },
    {
      label: "Global-Mark",
      href: "https://www.global-mark.com.au/",
      src: "/icons/global-mark-logo.jpg",
      imgStyle: { height: 22 },
    },
    {
      label: "Certification Body Australia",
      href: "https://certificationbody.com.au/",
      src: "/icons/certification-body-logo.jpg",
      imgStyle: { height: 22 },
    },
    {
      label: "SGS",
      href: "https://www.sgs.com/en-au",
      src: "/icons/sgs-logo.png",
      imgStyle: { height: 22 },
    },
  ];
  const socialLinks = [
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      color: iconColors.linkedin,
      icon: (
        <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.8h.05c.53-1 1.84-2.06 3.79-2.06C20.4 8.74 22 11.1 22 14.6V21h-4v-5.4c0-1.3-.02-3-1.85-3-1.86 0-2.15 1.45-2.15 2.9V21H9z" />
      ),
    },
    {
      label: "YouTube",
      href: `https://www.youtube.com/share?url=${encodeURIComponent(shareUrl)}`,
      color: iconColors.youtube,
      icon: (
        <path d="M21.8 8.4s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C16.2 5.2 12 5.2 12 5.2h0s-4.2 0-6.9.3c-.4.1-1.3.1-2.1.9-.6.6-.8 2-.8 2S2 10 2 11.6v.8C2 14 2.2 15.6 2.2 15.6s.2 1.4.8 2c.8.8 1.9.8 2.4.9 1.7.2 6.6.3 6.6.3s4.2 0 6.9-.3c.4-.1 1.3-.1 2.1-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-.8c0-1.6-.2-3.2-.2-3.2zM10 14.7V9.3l5.2 2.7L10 14.7z" />
      ),
    },
    {
      label: "WeChat",
      href: `https://www.addtoany.com/add_to/wechat?linkurl=${encodeURIComponent(
        shareUrl
      )}&linkname=${encodeURIComponent(shareTitle)}`,
      color: iconColors.wechat,
      icon: (
        <path d="M8.6 5.5c-3.3 0-6 2.1-6 4.7 0 1.5.9 2.9 2.3 3.8l-.7 2.2 2.5-1.4c.6.1 1.2.2 1.9.2.3 0 .6 0 .9-.1-.2-.5-.3-1-.3-1.6 0-2.7 2.6-4.9 5.9-5.1-1-1.6-3-2.7-5.5-2.7zm-2 2.3c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm4 0c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zM21.4 13.5c0-2.5-2.5-4.6-5.6-4.6-3.1 0-5.6 2.1-5.6 4.6 0 2.5 2.5 4.6 5.6 4.6.6 0 1.2-.1 1.8-.2l2 1.1-.6-1.9c1.4-.8 2.4-2.1 2.4-3.6zm-7.8-1.3c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm4.4 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" />
      ),
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`,
      color: iconColors.whatsapp,
      icon: (
        <path d="M20.5 11.6a8.4 8.4 0 10-15.8 4.2L4 21l5.5-1.4a8.4 8.4 0 0011-8zM12 19a7 7 0 01-3.6-1l-.3-.2-3.3.9.9-3.2-.2-.3a7 7 0 1113.2-3.6 7 7 0 01-7 7zm3.8-5.2c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.2-.6.7-.7.8-.1.1-.3.1-.5 0-.2-.1-.9-.3-1.7-1.1-.6-.5-1-1.2-1.1-1.4-.1-.2 0-.3.1-.5.1-.1.2-.3.3-.4.1-.1.1-.2.2-.4.1-.1 0-.2 0-.4-.1-.1-.5-1.2-.7-1.7-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2 0 1.2.8 2.3.9 2.5.1.2 1.6 2.5 3.9 3.5.5.2.9.4 1.2.5.5.2.9.2 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.4-.2z" />
      ),
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      color: iconColors.facebook,
      icon: (
        <path d="M13.5 9H16V6h-2.5C11.6 6 10 7.6 10 9.5V12H8v3h2v6h3v-6h2.4l.6-3H13V9.5c0-.3.2-.5.5-.5z" />
      ),
    },
    {
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`,
      useCurrentColor: false,
      color: iconColors.email,
      size: 48,
      icon: (
        <g>
          <path fill="var(--brand-100)" d="M4 7h16v10H4z" />
          <path fill="var(--brand-200)" d="M4 7l8 5 8-5" />
          <path fill="var(--brand-600)" d="M4 17l5-3 3 2 3-2 5 3" />
          <circle cx="12" cy="12" r="4" fill="var(--brand-800)" />
          <text
            x="12"
            y="12.4"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="7.5"
            fill="#FFFFFF"
            fontFamily="Arial, sans-serif"
          >
            @
          </text>
        </g>
      ),
    },
  ];

  return (
    <footer className="bg-brand-800 text-brand-100">
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* 2 rows x 4 columns, headings with subheadings aligned beneath */}
        <div className="grid grid-cols-4 gap-6">
          {footerNavigation.map((section) => (
            <div key={section.header} className="space-y-2 group">
              <div className="text-sm font-semibold text-brand-100">{section.header}</div>
              <ul className="space-y-1 text-xs text-brand-200 hidden group-hover:block">
                {section.links.map((link) => (
                  <li key={link.label} className="flex items-start gap-2">
                    {link.binding && (
                      <span className="text-[10px] uppercase text-brand-200" aria-label="Binding">
                        Binding
                      </span>
                    )}
                    {link.href ? (
                      <Link href={link.href} className="text-brand-200 hover:text-brand-100">
                        {link.label}
                      </Link>
                    ) : (
                      <span className="text-brand-200">{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center flex-nowrap justify-between gap-0 w-full overflow-x-auto">
            {governmentLogos.map((logo) => (
              <a
                key={logo.label}
                href={logo.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={logo.label}
                className="footer-gov-logo flex-shrink-0"
                title={logo.label}
              >
                <Image
                  src={logo.src}
                  alt={logo.label}
                  width={140}
                  height={48}
                  className="footer-gov-logo-img"
                  style={logo.imgStyle}
                  sizes="140px"
                />
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {socialLinks.map((item) => {
              const useCurrentColor = item.useCurrentColor !== false;
              const size = item.size ?? 36;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  className="h-12 w-12 rounded-full border border-border bg-surface flex items-center justify-center shadow-card"
                  style={{ color: item.color }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={size}
                    height={size}
                    fill={useCurrentColor ? "currentColor" : "none"}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </svg>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer base strip */}
      <div className="border-t border-brand-600 bg-brand-900 text-xs text-brand-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-4">
            <span>© RedRooEnergy Pty Ltd</span>
            <span>ABN / ACN</span>
            <span>Jurisdiction: Australia</span>
            <span>Regulatory statement (short, static text)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
