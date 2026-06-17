import { createImportJob } from "./pipeline-utils";

await createImportJob("recalculate:ratings", {
  note: "Recalculate helpfulness counters without presenting temples as a competitive rating."
});
