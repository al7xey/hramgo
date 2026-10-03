import { createImportJob } from "./pipeline-utils";

await createImportJob("check:stale-data", {
  note: "Flag schedules, phones, and Sunday school fields that need another manual check."
});
