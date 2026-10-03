import { createImportJob } from "./pipeline-utils";

await createImportJob("moderation:queue", {
  note: "Move uncertain fields and photos into moderator queues."
});
