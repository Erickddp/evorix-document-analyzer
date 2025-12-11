export type DocumentKind =
    | "unknown"
    | "invoice"
    | "contract"
    | "receipt"
    | "letter"
    | "report"
    | "payroll"
    | "bank_statement"
    | "id"
    | "policy"
    | "other";

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
    pageCount?: number; // Preserving pageCount as it was in mock usage
    gpsCoordinates?: { lat: number; lng: number }; // Preserving mock usage

    // EXIF básico – solo para imágenes (simulado por ahora)
    exifCamera?: string | null;
    exifLocation?: string | null;

    hasBasicScan?: boolean;
    hasDeepScan?: boolean;
    hasMetadataScan?: boolean; // legacy flag kept for compatibility
    lastUpdatedAt?: string | null;
}

export interface DocumentKeyData {
    names: string[];
    rfcs: string[];
    dates: string[];
    amounts: number[];
    keys: string[];
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
