import type { DocumentKind } from "../../types/documents";

/**
 * Infiere el tipo de documento basado en su extensión y nombre.
 * Reglas de negocio:
 * - XML CFDI: extensión .xml
 * - FACTURA: .pdf + palabras clave (factura, cfdi, recibo)
 * - ESTADO_CUENTA: .pdf + palabras clave (estado, cuenta, bank, bbva, etc.)
 * - HOJA_CALCULO: .csv, .xls, .xlsx, .ods
 * - IMAGEN: .jpg, .jpeg, .png, .gif, .webp
 * - TEXTO: .txt, .md, .log
 * - OTRO: cualquier otro caso
 */
export function inferDocumentKind(info: { fileName: string; extension: string }): DocumentKind {
    const ext = info.extension.toLowerCase().replace('.', '');
    const name = info.fileName.toLowerCase();

    // 1. XML -> XML_CFDI (asumiendo que es CFDI por defecto si es XML en este contexto)
    if (ext === 'xml') {
        return "XML_CFDI";
    }

    // 2. Imagenes
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'];
    if (imageExts.includes(ext)) {
        return "IMAGEN";
    }

    // 3. Hojas de cálculo
    const spreadsheetExts = ['csv', 'xls', 'xlsx', 'ods', 'numbers'];
    if (spreadsheetExts.includes(ext)) {
        return "HOJA_CALCULO";
    }

    // 4. Texto plano
    const textExts = ['txt', 'md', 'log', 'rtf'];
    if (textExts.includes(ext)) {
        return "TEXTO";
    }

    // 5. Reglas específicas para PDF (o similares)
    if (ext === 'pdf') {
        // Facturas
        if (name.includes('factura') || name.includes('cfdi') || name.includes('recibo') || name.includes('invoice')) {
            return "FACTURA";
        }

        // Estados de cuenta
        // "estado" y "cuenta" suelen ir juntos, o nombres de bancos
        const bankTerms = ['estado', 'cuenta', 'bank', 'bbva', 'santander', 'banamex', 'hsbc', 'banorte', 'scotiabank', 'amex', 'american express'];
        if (bankTerms.some(term => name.includes(term))) {
            return "ESTADO_CUENTA";
        }

        // Si no cae en los anteriores, es un PDF general
        return "PDF_GENERAL";
    }

    // 6. Tickets (normalmente imágenes o pdfs pequeños, pero por nombre...)
    if (name.includes('ticket') || name.includes('compra')) {
        return "TICKET";
    }

    return "OTRO";
}
