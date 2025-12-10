import type { DocumentBasic, DocumentMetadata } from "../../types/documents";
import type { MetadataResult } from "./metadata.types";

export function extractBasicMetadata(
    file: File,
    _basic: DocumentBasic
): MetadataResult {
    const createdAt = new Date(file.lastModified).toISOString();

    const metadata: DocumentMetadata = {
        author: null, // El navegador no expone esto
        createdAt,
        modifiedAt: createdAt,
        software: null,
        device: null,
        gpsCoordinates: null,
        pageCount: null, // Requiere parseo específico por tipo (PDF, DOCX, etc.)
    };

    return { metadata };
}
