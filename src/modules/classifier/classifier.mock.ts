import type {
    DocumentBasic,
    DocumentKeyData,
    DocumentMetadata,
    DocumentKind,
} from "../../types/documents";

export function classifyDocument(
    basic: DocumentBasic,
    keyData: DocumentKeyData,
    metadata: DocumentMetadata
): { kind: DocumentKind; confidence: number } {
    const ext = basic.extension.toLowerCase();
    const hasRfc = keyData.rfcs && keyData.rfcs.length > 0;
    const hasAmounts = keyData.amounts && keyData.amounts.length > 0;
    const pageCount = metadata.pageCount ?? null;
    const textSignals = keyData.rawText?.toLowerCase?.() ?? '';
    // Also check names or other hints if available in rawText or keyData
    // We can simulate textSignals from what we have if rawText is missing but we have extracted data
    // but the prompt implies we might have rawText. 
    // In the store, we pass 'extractor.keyData'. 

    // Capa 1: por extensión base
    let baseKind: DocumentKind = 'desconocido';

    if (['xml', 'pdf'].includes(ext)) baseKind = 'documento_general';
    if (['jpg', 'jpeg', 'png', 'webp', 'tiff'].includes(ext)) baseKind = 'imagen';
    if (['xls', 'xlsx', 'csv'].includes(ext)) baseKind = 'datos_tabulares';
    if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) baseKind = 'documento_general';
    if (['ppt', 'pptx'].includes(ext)) baseKind = 'presentacion';

    // Capa 2: señales de factura / ticket
    // If rawText isn't present, we rely on other indicators or just filename if extraction failed
    const filenameSignals = basic.fileName.toLowerCase();
    const combinedSignals = (textSignals + ' ' + filenameSignals).toLowerCase();

    const hasInvoiceWords =
        combinedSignals.includes('factura') ||
        combinedSignals.includes('cfdi') ||
        combinedSignals.includes('sat') ||
        combinedSignals.includes('xml'); // XML often implies invoice in this context

    // Ticket words
    const hasTicketWords =
        combinedSignals.includes('ticket') ||
        combinedSignals.includes('compra') ||
        combinedSignals.includes('caja') ||
        combinedSignals.includes('recibo');

    // Logic from prompt
    if (['xml', 'pdf'].includes(ext) && hasRfc && hasAmounts && hasInvoiceWords) {
        return { kind: 'factura', confidence: 0.95 };
    }

    if (baseKind === 'imagen' || (ext === 'pdf' && hasTicketWords && hasAmounts)) {
        return { kind: 'ticket_recibo', confidence: 0.80 };
    }

    if (pageCount && pageCount > 20 && !hasRfc && !hasAmounts && ext === 'pdf') {
        return { kind: 'documento_general', confidence: 0.70 }; // libro / documento largo
    }

    if (baseKind === 'datos_tabulares') {
        return { kind: 'datos_tabulares', confidence: hasAmounts ? 0.85 : 0.60 };
    }

    if (baseKind === 'presentacion') {
        return { kind: 'presentacion', confidence: 0.75 };
    }

    if (baseKind === 'documento_general') {
        // Differentiation between report, contract, generic
        if (combinedSignals.includes('contrato')) return { kind: 'contrato', confidence: 0.85 };
        if (combinedSignals.includes('nomina')) return { kind: 'nomina', confidence: 0.85 };
        if (combinedSignals.includes('reporte')) return { kind: 'reporte', confidence: 0.85 };

        return { kind: 'documento_general', confidence: hasInvoiceWords ? 0.60 : 0.50 };
    }

    // Default fallbacks
    return { kind: baseKind, confidence: 0.40 };
}

