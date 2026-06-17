import { createImportJob } from "./pipeline-utils";

await createImportJob("sync:temple-sources", {
  note: "Refresh TempleSource snapshots and mark stale evidence."
});
