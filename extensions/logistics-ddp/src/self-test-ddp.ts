import { calculateDDPAudited } from "./calc";

const result = calculateDDPAudited(
  {
    shipmentId: "SHIP-001",
    hsCode: "850760",
    originCountry: "CN",
    destinationCountry: "AU",
    declaredValue: 10000,
    currency: "AUD",
    weightKg: 120,
  },
  "REQ-DDP-TEST-001"
);

console.log(result);
