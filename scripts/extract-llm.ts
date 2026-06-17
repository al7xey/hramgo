import { templeExtractionPrompt } from "../src/lib/llm/temple-extraction-prompt";
import { createImportJob } from "./pipeline-utils";

await createImportJob("extract:llm", {
  note: "Run LLM extraction with evidence-first JSON schema.",
  promptLength: templeExtractionPrompt.length
});
