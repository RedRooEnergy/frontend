import FooterPageLayout from "../../../components/FooterPageLayout";
import MediaPressKitDownload from "../../../components/MediaPressKitDownload";

export default function Page() {
  const intro = [
    "RedRooEnergy provides this Media & Press Kit to support accurate and consistent public communication.",
    "This page is intended for journalists, partners, and third parties seeking reliable reference information about the marketplace.",
  ];

  const sections = [
    {
      heading: "Overview",
      paragraphs: [
        "RedRooEnergy operates as a governed renewable energy marketplace focused on approved products for the Australian market.",
        "The platform connects buyers with independent suppliers and applies upfront checks before products are listed.",
      ],
    },
    {
      heading: "What RedRooEnergy Does",
      paragraphs: [],
      bullets: [
        "Operates a structured online marketplace",
        "Connects buyers with approved renewable energy products",
        "Applies compliance checks before listing",
        "Supports residential, commercial, and project buyers",
        "Provides consistent ordering and delivery workflows",
      ],
      afterBullets: ["RedRooEnergy does not manufacture products and does not act as an installer or freight operator."],
    },
    {
      heading: "Approved Descriptions",
      paragraphs: [
        "Short description:",
        "RedRooEnergy is an Australian renewable energy marketplace offering approved products through a structured platform.",
        "Standard description:",
        "RedRooEnergy operates a governed marketplace connecting buyers with renewable energy products reviewed against Australian requirements. The platform focuses on transparency, consistency, and reduced uncertainty across ordering and delivery.",
      ],
    },
    {
      heading: "Use of Media Materials",
      paragraphs: [
        "Media assets are provided for editorial and informational use only.",
        "Materials must not be altered in a way that misrepresents RedRooEnergy's role or operating model.",
      ],
    },
  ];

  return (
    <FooterPageLayout
      title={"Media & Press Kit"}
      subtitle="Information and resources for media and public reference."
      intro={intro}
      sections={sections}
    >
      <MediaPressKitDownload />
    </FooterPageLayout>
  );
}
