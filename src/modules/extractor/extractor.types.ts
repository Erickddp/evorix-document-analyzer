import type { DocumentKeyData } from "../../types/documents";

export interface ExtractorResult {
    keyData: DocumentKeyData;
    contentPreview: string | null;
    language?: "es" | "en" | "other" | null;
}
