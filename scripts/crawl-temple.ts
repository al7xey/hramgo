import { createImportJob } from "./pipeline-utils";

await createImportJob("crawl:temple", {
  note: "Fetch approved source pages, strip unsafe HTML, and store raw text snapshots."
});
