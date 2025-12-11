import type { DocumentAnalysis } from "../../types/documents";



export interface MetadataResultRaw {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    createdAt?: string;
    updatedAt?: string;
    // Deep Only
    author?: string;
    software?: string;
    device?: string;
    location?: string;
    pages?: number;
    owner?: string;
    appName?: string;
    gps?: string;
}

export function extractBasicMetadata(
    doc: DocumentAnalysis
): Promise<MetadataResultRaw> {
    return new Promise((resolve) => {
        setTimeout(() => {
            const size = doc.basic.sizeBytes;
            const now = new Date();

            // Simular datos basicos que se obtienen del sistema de archivos
            resolve({
                fileName: doc.basic.fileName,
                fileSize: size,
                mimeType: inferMimeType(doc.basic.extension),
                createdAt: doc.basic.uploadedAt || now.toISOString(),
                updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * Math.floor(Math.random() * 10)).toISOString(),
            });
        }, 300 + Math.random() * 200);
    });
}

export function extractDeepMetadata(
    _doc: DocumentAnalysis
): Promise<MetadataResultRaw> {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simular datos profundos (exif, internal properties)
            resolve({
                author: "Erick DDP",
                owner: "EVORIX Admin",
                software: "Adobe Acrobat Pro / Microsoft Word",
                device: Math.random() > 0.5 ? "iPhone 14 Pro" : "Scanner Epson V600",
                location: Math.random() > 0.5 ? "Mexico City, MX" : "Guadalajara, MX",
                pages: Math.floor(Math.random() * 20) + 1,
                appName: "EVORIX Extractor Engine V2",
                ... (Math.random() > 0.7 ? { gps: "19.4326° N, 99.1332° W" } : {})
            });
        }, 800 + Math.random() * 500);
    });
}

function inferMimeType(ext: string): string {
    const map: Record<string, string> = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'xml': 'text/xml',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
}

