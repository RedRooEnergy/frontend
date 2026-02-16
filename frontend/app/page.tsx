import Hero from "../components/Hero";
import CategoryPanel from "../components/CategoryPanel";
import ShoppingTools from "../components/ShoppingTools";
import ServiceAgentsSection from "../components/ServiceAgentsSection";
import BestDealsSection from "../components/BestDealsSection";
import FeaturedItemsSection from "../components/FeaturedItemsSection";
import SupplierHotDealsSection from "../components/SupplierHotDealsSection";
import CatalogueSection from "../components/CatalogueSection";

export default function HomePage() {
  return (
    <div className="rre-home-bg">
      <div className="rre-home-curve rre-home-curve-top" aria-hidden />
      <div className="rre-home-curve rre-home-curve-mid" aria-hidden />
      <div className="rre-home-curve rre-home-curve-bottom" aria-hidden />
      <div className="rre-home-ribbon rre-home-ribbon-1" aria-hidden />
      <div className="rre-home-ribbon rre-home-ribbon-2" aria-hidden />
      <div className="rre-home-ribbon rre-home-ribbon-3" aria-hidden />
      <main className="rre-home-content space-y-4 pb-8">
        <Hero />
        <CategoryPanel />
        <ShoppingTools />
        <BestDealsSection />
        <CatalogueSection />
        <FeaturedItemsSection />
        <SupplierHotDealsSection />
        <ServiceAgentsSection />
      </main>
    </div>
  );
}
