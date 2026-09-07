import { DatasetExplorer } from "@/features/datasets/components/dataset-explorer";
import type { DatasetDetail } from "@/features/datasets/queries";
import type { DatasetExplorerBlockData } from "@/features/datasets/schemas";

/**
 * `DATASET_EXPLORER` adapter.
 *
 * The dataset row arrives already fetched and validated by
 * `getLessonContentBlocks` — the same arrangement `SPEC_TABLE` uses for
 * its `HardwareDevice`, so a lesson referencing one dataset from three
 * blocks (M3.9 does) issues one query, not three (§26).
 */
export function DatasetExplorerBlock({
  dataset,
  data,
}: {
  dataset: DatasetDetail;
  data: DatasetExplorerBlockData;
}) {
  return <DatasetExplorer dataset={dataset} data={data} />;
}
