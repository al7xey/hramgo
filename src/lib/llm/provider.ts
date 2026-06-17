import { env } from "@/lib/env";

export type LlmEvidence = {
  field: string;
  value: string;
  sourceUrl: string;
  quote: string;
  confidence: number;
};

export type TempleExtractionResult = {
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  rectorName: string | null;
  vicariate: string | null;
  deanery: string | null;
  objectType: string | null;
  scheduleSummary: string | null;
  sundaySchoolStatus: "yes" | "no" | "unknown";
  sundaySchoolDescription: string | null;
  evidence: LlmEvidence[];
  photos: Array<{
    url: string;
    sourceUrl: string;
    alt: string | null;
    copyrightStatus: "official_site" | "permission_needed" | "open_license" | "manual_review";
  }>;
};

export interface LlmProvider {
  extractTempleData(input: { sourceUrl: string; htmlText: string }): Promise<TempleExtractionResult>;
}

export function createLlmProvider(): LlmProvider {
  return {
    async extractTempleData() {
      if (!env.LLM_API_KEY) {
        throw new Error("LLM_API_KEY is required for extraction");
      }

      throw new Error(`LLM provider '${env.LLM_PROVIDER}' is not configured yet`);
    }
  };
}
