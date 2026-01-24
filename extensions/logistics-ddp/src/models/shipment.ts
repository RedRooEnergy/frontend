import { DutyCalculation } from "./duty-calculation";

export type Shipment = {
  readonly shipmentId: string;
  readonly originCountry: string;
  readonly destinationCountry: string;
  readonly incoterm: "DDP"; // locked — no alternatives
  readonly duty: DutyCalculation;
  readonly createdAt: string;
};
