import { resolveCataloguePlacementCards } from "./services/PlacementEngineService";

export function buildCatalogueSectionForWeek(weekId: string) {
  const cards = resolveCataloguePlacementCards(weekId);

  return {
    weekId,
    section: {
      id: "service-partners-paid-placement",
      label: "Service Partners (Paid Placements)",
      cards: cards.map((card) => ({
        href: card!.href,
        entityType: card!.entityType,
        tier: card!.tier,
        position: card!.position,
        snapshotVersion: card!.snapshotVersion,
        paidPlacementLabel: "Paid Placement",
      })),
    },
  };
}
