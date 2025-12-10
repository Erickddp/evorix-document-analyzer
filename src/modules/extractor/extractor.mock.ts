import type { DocumentBasic, DocumentKeyData } from "../../types/documents";
import type { ExtractorResult } from "./extractor.types";

const RFC_REGEX = /\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/g;
const DATE_REGEX = /\b(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})\b/g;
const AMOUNT_REGEX = /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g;

export async function quickExtractFromFile(
    file: File,
    basic: DocumentBasic
): Promise<ExtractorResult> {
    const extension = basic.extension;

    // Sólo intentamos leer como texto en tipos "seguros"
    const textExtensions = ["txt", "log", "json", "csv", "xml", "html", "htm"];
    let rawText: string | null = null;

    if (textExtensions.includes(extension)) {
        try {
            rawText = await file.text();
        } catch {
            rawText = null;
        }
    }

    if (!rawText) {
        // No pudimos leer texto, devolvemos keyData vacío pero consistente
        return {
            keyData: {
                names: [],
                rfcs: [],
                dates: [],
                amounts: [],
                keys: [],
            },
            contentPreview: null,
            language: null,
        };
    }

    const keyData = analyzePlainText(rawText);
    const contentPreview = createPreview(rawText);
    const language = detectLanguage(rawText);

    return {
        keyData,
        contentPreview,
        language,
    };
}

function analyzePlainText(raw: string): DocumentKeyData {
    const rfcs = Array.from(new Set((raw.match(RFC_REGEX) ?? [])));

    const dates = Array.from(new Set((raw.match(DATE_REGEX) ?? [])));

    const amountsRaw = raw.match(AMOUNT_REGEX) ?? [];
    const amounts = Array.from(
        new Set(
            amountsRaw
                .map((a) => Number(a.replace(/,/g, "")))
                .filter((n) => !Number.isNaN(n))
        )
    );

    // Nombres muy simples: secuencias de 2–4 palabras Capitalizadas
    const namesSet = new Set<string>();
    const nameRegex = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})\b/g;
    let match: RegExpExecArray | null;
    while ((match = nameRegex.exec(raw)) !== null) {
        namesSet.add(match[1]);
    }

    // "keys" genéricas: palabras en mayúsculas largas
    const keysSet = new Set<string>();
    const keysRegex = /\b[A-Z0-9_\-]{6,}\b/g;
    let kmatch: RegExpExecArray | null;
    while ((kmatch = keysRegex.exec(raw)) !== null) {
        keysSet.add(kmatch[0]);
    }

    return {
        names: Array.from(namesSet),
        rfcs,
        dates,
        amounts,
        keys: Array.from(keysSet),
    };
}

function createPreview(raw: string): string | null {
    const trimmed = raw.trim().replace(/\s+/g, " ");
    if (!trimmed) return null;
    return trimmed.slice(0, 240);
}

function detectLanguage(raw: string): "es" | "en" | "other" {
    const lower = raw.toLowerCase();
    const esHits = ["factura", "contrato", "reporte", "pago", "rfc", "monto"].filter((w) =>
        lower.includes(w)
    ).length;
    const enHits = ["invoice", "contract", "report", "payment", "amount"].filter((w) =>
        lower.includes(w)
    ).length;

    if (esHits > enHits && esHits > 0) return "es";
    if (enHits > esHits && enHits > 0) return "en";
    return "other";
}
