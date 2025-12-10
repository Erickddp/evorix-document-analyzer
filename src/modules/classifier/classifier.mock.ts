import type {
    DocumentBasic,
    DocumentKeyData,
    DocumentMetadata,
    DocumentKind,
} from "../../types/documents";
import type { ClassifierResult } from "./classifier.types";

export function classifyDocument(
    basic: DocumentBasic,
    keyData: DocumentKeyData,
    _metadata: DocumentMetadata
): ClassifierResult {
    const name = basic.fileName.toLowerCase();
    const hints: string[] = [];
    let kind: DocumentKind = basic.kind ?? "unknown";
    let confidence = 0.1;

    const pushHint = (h: string) => {
        if (!hints.includes(h)) hints.push(h);
    };

    // 1) Por nombre / extensión
    if (name.includes("factura") || name.includes("invoice")) {
        kind = "invoice";
        confidence = 0.7;
        pushHint("nombre: factura/invoice");
    }

    if (name.includes("contrato") || name.includes("contract")) {
        kind = "contract";
        confidence = 0.7;
        pushHint("nombre: contrato/contract");
    }

    if (name.includes("recibo") || name.includes("receipt")) {
        kind = "receipt";
        confidence = 0.6;
        pushHint("nombre: recibo/receipt");
    }

    if (name.includes("nomina") || name.includes("payroll")) {
        kind = "payroll";
        confidence = 0.6;
        pushHint("nombre: nómina/payroll");
    }

    // 2) Por contenido clave
    if (keyData.rfcs && keyData.rfcs.length > 0 && confidence < 0.9) {
        // presencia de RFC suele indicar documento fiscal
        if (kind === "unknown") kind = "invoice";
        confidence = Math.max(confidence, 0.8);
        pushHint("contiene RFC");
    }

    if (keyData.amounts && keyData.amounts.length > 0 && confidence < 0.85) {
        confidence = Math.max(confidence, 0.6);
        pushHint("contiene montos numéricos");
    }

    // Si no se detectó nada relevante, mantén kind actual
    return {
        kind,
        confidence,
        hints,
    };
}
