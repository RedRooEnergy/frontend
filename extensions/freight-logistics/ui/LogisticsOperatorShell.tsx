/**
 * LogisticsOperatorShell
 * Read-only UI wired to EXT-10 shipment routes.
 * No signalling, no mutations, no inferred state.
 */

import { useEffect, useState } from "react";
import {
  emitShipmentListView
} from "../events/logistics.events";

type ShipmentProjection = {
  shipment: {
    shipmentId: string;
    shipmentType: string;
    state: string;
    origin?: string;
    destination?: string;
  };
  consignments: {
    consignmentId: string;
    state: string;
    packageCount?: number;
    containerReference?: string | null;
  }[];
};

export default function LogisticsOperatorShell() {
  const [shipments, setShipments] = useState<ShipmentProjection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadShipments() {
      try {
        const res = await fetch("/logistics/shipments");
        const data = await res.json();
        setShipments(data.shipments || []);
        emitShipmentListView();
      } catch {
        setShipments([]);
      } finally {
        setLoading(false);
      }
    }

    loadShipments();
  }, []);

  if (loading) {
    return <p>Loading shipments…</p>;
  }

  if (!shipments.length) {
    return <p>No assigned shipments.</p>;
  }

  return (
    <div>
      <h1>Assigned Shipments</h1>

      <ul>
        {shipments.map((item, index) => (
          <li key={index}>
            <strong>Shipment:</strong> {item.shipment.shipmentType}  
            <br />
            <strong>Status:</strong> {item.shipment.state}  
            <br />
            <strong>Route:</strong>{" "}
            {item.shipment.origin} → {item.shipment.destination}
            <br />
            <strong>Consignments:</strong> {item.consignments.length}
          </li>
        ))}
      </ul>
    </div>
  );
}
