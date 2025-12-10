export type ClassifierLabel = "invoice" | "contract" | "unknown";

export interface ClassifierResult {
    label: ClassifierLabel;
    score: number;
}
