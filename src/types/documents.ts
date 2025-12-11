export type DocumentKind =
    | 'factura'
    | 'ticket_recibo'
    | 'nomina'
    | 'contrato'
    | 'reporte'
    | 'documento_general'
    | 'imagen'
    | 'datos_tabulares'
    | 'presentacion'
    | 'desconocido';

export const DOCUMENT_KIND_LABEL_ES: Record<DocumentKind, string> = {
    factura: 'Factura',
    ticket_recibo: 'Ticket / Recibo',
    nomina: 'Nómina',
    contrato: 'Contrato',
    reporte: 'Reporte',
    documento_general: 'Documento',
    imagen: 'Imagen',
    datos_tabulares: 'Hoja de cálculo',
    presentacion: 'Presentación',
    desconocido: 'Desconocido',
};

export type ScanPhase = "idle" | "queued" | "quick-scanning" | "deep-scannable" | "completed" | "error";

export interface DocumentScanState {
    phase: ScanPhase;
    estimatedQuickMs: number | null;
    errorMessage?: string | null;
}

export interface DocumentBasic {
    id: string;
    fileName: string;
    extension: string;
    sizeBytes: number;
    uploadedAt: string;
    kind: DocumentKind;
    sourcePath?: string | null;
    scan: DocumentScanState;
    ocrEligible?: boolean;
}

export interface DocumentMetadata {
    author?: string | null;
    software?: string | null;
    createdAt?: string | null;
    modifiedAt?: string | null;
    device?: string | null;
    mimeType?: string | null;
    pageCount?: number;
    gpsCoordinates?: { lat: number; lng: number };

    // New fields requested
    owner?: string | null;
    appName?: string | null;
    location?: string | null;
    fileSize?: number;

    // EXIF básico – solo para imágenes (simulado por ahora)
    exifCamera?: string | null;
    exifLocation?: string | null;

    hasBasicScan?: boolean;
    hasDeepScan?: boolean;
    hasMetadataScan?: boolean;
    lastUpdatedAt?: string | null;

    levels?: {
        l1?: boolean;
        l2?: boolean;
    };
}

export interface DocumentKeyData {
    names: string[];
    rfcs: string[];
    dates: string[];
    amounts: number[];
    keys: string[];
    // Extended properties for LLM scan
    score?: number;
    tags?: string[];
    // flags de estado
    hasQuickScan?: boolean;
    hasFullContent?: boolean;
    lastUpdatedAt?: string | null;
    // stored text for L2
    rawText?: string | null;
}

export interface DocumentOcrInfo {
    hasOcrText: boolean;
    engine?: string | null;
    processedAt?: string | null;
    rawTextPreview?: string | null;
}

export interface DocumentAnalysis {
    basic: DocumentBasic;
    metadata: DocumentMetadata;
    keyData: DocumentKeyData;
    classificationConfidence: number; // 0–1
    ocrInfo?: DocumentOcrInfo;
}

export interface DocumentsFilters {
    search: string;
    kind: DocumentKind | "all";
    hasMetadata: "all" | "yes" | "no";
    sizeBucket: "all" | "small" | "medium" | "large";
}

export interface ScanJobMetrics {
    isScanning: boolean;
    totalFiles: number;
    processedFiles: number;
    startedAt: string | null;
    estimatedMsRemaining: number | null;
}

export interface DocumentsStoreState {
    items: DocumentAnalysis[];
    filtered: DocumentAnalysis[];
    filters: DocumentsFilters;
    selectedId: string | null;
    scanJob: ScanJobMetrics;
    setFilters: (partial: Partial<DocumentsFilters>) => void;
    selectDocument: (id: string | null) => void;
    setMockDocuments: (docs: DocumentAnalysis[]) => void;
    clearAll: () => void;
    ingestFiles: (files: FileList | File[]) => Promise<void>;
    resetScanJob: () => void;
    requestDeepScan: (documentId: string) => void;
}
