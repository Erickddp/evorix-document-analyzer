export interface ExtractorResult {
    confidence: number;
    fields: Record<string, string | number | null>;
}
