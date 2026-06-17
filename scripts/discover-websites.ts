import { createImportJob } from "./pipeline-utils";

await createImportJob("discover:websites", {
  note: "Find likely official parish websites and keep candidates for admin verification."
});
