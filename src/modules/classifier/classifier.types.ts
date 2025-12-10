import type { DocumentKind } from "../../types/documents";

export interface ClassifierResult {
    kind: DocumentKind;
    confidence: number; // 0–1
    hints: string[];    // palabras clave usadas para clasificar
}
