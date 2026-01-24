/**
 * RecordsPortalShell
 * Read-only UI wired to EXT-14 records routes.
 * No uploads, no exports, no inferred state.
 */

import { useEffect, useState } from "react";
import {
  emitRecordListViewed
} from "../events/records.events";

type RecordProjection = {
  recordId: string;
  recordType: string;
  evidenceClass: string;
  relatedEntityType: string;
  relatedEntityId: string;
  createdAt: string;
  createdBy: string;
  retentionCategory: string;
  legalHold: boolean;
  state: string;
};

export default function RecordsPortalShell() {
  const [records, setRecords] = useState<RecordProjection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecords() {
      try {
        const res = await fetch("/records");
        const data = await res.json();
        setRecords(data.records || []);
        emitRecordListViewed();
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    }

    loadRecords();
  }, []);

  if (loading) {
    return <p>Loading records…</p>;
  }

  if (!records.length) {
    return <p>No records available.</p>;
  }

  return (
    <div>
      <h1>Documents & Records</h1>

      <ul>
        {records.map(r => (
          <li key={r.recordId}>
            <strong>{r.recordType}</strong> ({r.evidenceClass})
            <br />
            Linked to: {r.relatedEntityType} #{r.relatedEntityId}
            <br />
            Created: {new Date(r.createdAt).toLocaleString()} by {r.createdBy}
            <br />
            Retention: {r.retentionCategory} • Legal Hold: {r.legalHold ? "YES" : "NO"}
            <br />
            State: {r.state}
          </li>
        ))}
      </ul>
    </div>
  );
}
