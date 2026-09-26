import type { LoftStore } from "../store";
import type { Batch, Pigeon, Arrival } from "../domain/types";

export interface PageProps {
  store: LoftStore;
  go: (tab: TabKey) => void;
  openBatch: (id?: string) => void;
  openArrival: (batchId: string, arrival?: Arrival, defaultRing?: string) => void;
  openPigeon: (ringId?: string) => void;
}

export type TabKey = "overview" | "batches" | "ranking" | "pending" | "missing" | "pigeons";

export function batchLabel(b: Batch): string {
  return b.name || `${b.releaseDate} ${b.location}`;
}

export function pigeonLabel(p: Pigeon | undefined, ringId: string): string {
  return p ? `${p.ringId} · ${p.bloodline || "未填血统"}` : ringId;
}
