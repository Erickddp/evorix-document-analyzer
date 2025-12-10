import { useState, useMemo, useEffect, useRef } from 'react';
import type {
    DocumentAnalysis,
    DocumentsFilters,
    DocumentKind,
    DocumentScanState,
    ScanJobMetrics,
} from '../types/documents';

// Update MOCK_DOCS to match new interface
const MOCK_DOCS: DocumentAnalysis[] = [
    {
        basic: {
            id: "1",
            fileName: "Factura_Global_Oct.pdf",
            extension: "pdf",
            sizeBytes: 1250000,
            uploadedAt: "2024-10-25T10:30:00Z",
            kind: "invoice",
            scan: { phase: "completed", estimatedQuickMs: 0, errorMessage: null },
            ocrEligible: true
        },
        metadata: {
            author: "Finanzas Corp",
            createdAt: "2024-10-24T09:00:00Z",
            software: "Adobe PDF Library 15.0",
            pageCount: 3
        },
        keyData: {
            amounts: [15400.50, 2464.08],
            rfcs: ["XAXX010101000"],
            dates: ["2024-10-24"]
        },
        classificationConfidence: 0.98
    },
    {
        basic: {
            id: "2",
            fileName: "Contrato_Servicios_2024.docx",
            extension: "docx",
            sizeBytes: 45000,
            uploadedAt: "2024-11-01T14:15:00Z",
            kind: "contract",
            scan: { phase: "completed", estimatedQuickMs: 0 },
            ocrEligible: false
        },
        metadata: {
            author: "Legal Dept",
            createdAt: "2024-10-28T11:20:00Z",
            software: "Microsoft Word",
            modifiedAt: "2024-10-30T16:00:00Z"
        },
        keyData: {
            names: ["Juan Pérez", "Empresa X S.A."],
            dates: ["2024-11-01", "2025-11-01"]
        },
        classificationConfidence: 0.95
    },
    {
        basic: {
            id: "3",
            fileName: "Ticket_Compra_Material.jpg",
            extension: "jpg",
            sizeBytes: 2100000,
            uploadedAt: "2024-11-02T09:00:00Z",
            kind: "receipt",
            scan: { phase: "completed", estimatedQuickMs: 0 },
            ocrEligible: true
        },
        metadata: {
            device: "iPhone 14 Pro",
            gpsCoordinates: { lat: 19.4326, lng: -99.1332 },
            createdAt: "2024-11-02T08:45:00Z"
        },
        keyData: {
            amounts: [450.00],
            dates: ["2024-11-02"]
        },
        classificationConfidence: 0.89
    },
    {
        basic: {
            id: "4",
            fileName: "Reporte_Anual_2023.pdf",
            extension: "pdf",
            sizeBytes: 5600000,
            uploadedAt: "2024-01-15T10:00:00Z",
            kind: "report",
            scan: { phase: "deep-scannable", estimatedQuickMs: 0 },
            ocrEligible: true
        },
        metadata: {
            author: "CEO Office",
            pageCount: 45,
            software: "InDesign"
        },
        keyData: {
            dates: ["2023-01-01", "2023-12-31"]
        },
        classificationConfidence: 0.99
    },
    {
        basic: {
            id: "5",
            fileName: "Nomina_Quincena_20.xml",
            extension: "xml",
            sizeBytes: 15000,
            uploadedAt: "2024-10-31T18:00:00Z",
            kind: "payroll",
            scan: { phase: "completed", estimatedQuickMs: 0 },
            ocrEligible: false
        },
        metadata: {
            createdAt: "2024-10-31T17:55:00Z"
        },
        keyData: {
            amounts: [12000.00],
            rfcs: ["PEPJ800101XYZ"]
        },
        classificationConfidence: 1.0
    },
    {
        basic: {
            id: "6",
            fileName: "Scan_Unknown_001.png",
            extension: "png",
            sizeBytes: 3200000,
            uploadedAt: "2024-11-03T08:10:00Z",
            kind: "unknown",
            scan: { phase: "queued", estimatedQuickMs: 1500 },
            ocrEligible: true
        },
        metadata: {
            device: "Scanner Epson",
            createdAt: "2024-11-03T08:05:00Z"
        },
        keyData: {},
        classificationConfidence: 0.4
    }
];

const DEFAULT_FILTERS: DocumentsFilters = {
    search: "",
    kind: "all",
    hasMetadata: "all",
    sizeBucket: "all"
};

const DEFAULT_SCAN_JOB: ScanJobMetrics = {
    isScanning: false,
    totalFiles: 0,
    processedFiles: 0,
    startedAt: null,
    estimatedMsRemaining: null
};

// --- Helpers ---
function inferKindFromExtension(ext: string): DocumentKind {
    switch (ext) {
        case 'xml': return 'invoice';
        case 'pdf': return 'report';
        case 'doc':
        case 'docx': return 'letter';
        case 'xls':
        case 'xlsx': return 'report';
        case 'jpg':
        case 'jpeg':
        case 'png': return 'other';
        default: return 'unknown';
    }
}

function estimateQuickScanMs(sizeBytes: number): number {
    if (sizeBytes < 1024 * 1024) return 200 + Math.random() * 200; // < 1MB: 200-400ms
    if (sizeBytes < 10 * 1024 * 1024) return 500 + Math.random() * 1000; // 1-10MB: 500-1500ms
    return 2000 + Math.random() * 2000; // >10MB: 2000-4000ms
}

function generateDocumentId(file: File): string {
    return `${Date.now()}-${file.name.replace(/\s+/g, '_')}-${Math.floor(Math.random() * 1000)}`;
}

export function useDocumentsStore() {
    const [items, setItems] = useState<DocumentAnalysis[]>(MOCK_DOCS);
    const [filters, setFiltersState] = useState<DocumentsFilters>(DEFAULT_FILTERS);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [scanJob, setScanJob] = useState<ScanJobMetrics>(DEFAULT_SCAN_JOB);

    // Use a ref to prevent overlapping processing intervals/timeouts
    const processingRef = useRef<number | null>(null);

    const filtered = useMemo(() => {
        return items.filter(doc => {
            // 1. Search
            if (filters.search) {
                const q = filters.search.toLowerCase();
                const matchName = doc.basic.fileName.toLowerCase().includes(q);
                const matchKey = Object.values(doc.keyData).some(arr =>
                    arr?.some((v: any) => String(v).toLowerCase().includes(q))
                );
                if (!matchName && !matchKey) return false;
            }

            // 2. Kind
            if (filters.kind !== "all" && doc.basic.kind !== filters.kind) {
                return false;
            }

            // 3. Metadata
            if (filters.hasMetadata !== "all") {
                const hasMeta = Object.keys(doc.metadata).length > 0;
                if (filters.hasMetadata === "yes" && !hasMeta) return false;
                if (filters.hasMetadata === "no" && hasMeta) return false;
            }

            // 4. Size Bucket
            if (filters.sizeBucket !== "all") {
                const size = doc.basic.sizeBytes;
                if (filters.sizeBucket === "small" && size > 1024 * 1024) return false; // > 1MB
                if (filters.sizeBucket === "medium" && (size <= 1024 * 1024 || size > 10 * 1024 * 1024)) return false;
                if (filters.sizeBucket === "large" && size <= 10 * 1024 * 1024) return false;
            }

            return true;
        });
    }, [items, filters]);

    const setFilters = (partial: Partial<DocumentsFilters>) => {
        setFiltersState(prev => ({ ...prev, ...partial }));
    };

    const selectDocument = (id: string | null) => {
        setSelectedId(id);
    };

    const setMockDocuments = (docs: DocumentAnalysis[]) => {
        setItems(docs);
    };

    const clearAll = () => {
        setItems([]);
        setFiltersState(DEFAULT_FILTERS);
        setSelectedId(null);
        setScanJob(DEFAULT_SCAN_JOB);
        if (processingRef.current) {
            clearTimeout(processingRef.current);
            processingRef.current = null;
        }
    };

    const resetScanJob = () => {
        setScanJob({
            isScanning: false,
            totalFiles: items.length,
            processedFiles: items.length,
            startedAt: null,
            estimatedMsRemaining: null
        });
    };

    const requestDeepScan = (documentId: string) => {
        console.log("TODO: Deep scan requested for", documentId);
    };

    // --- Async Pipeline Logic ---

    const ingestFiles = async (files: FileList | File[]) => {
        // Convert to array
        const filesArray = Array.from(files).filter(f => f.size > 0);
        if (filesArray.length === 0) return;

        const now = new Date().toISOString();

        const newDocs: DocumentAnalysis[] = filesArray.map(file => {
            const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
            const kind = inferKindFromExtension(extension);
            const ocrEligible = extension === "pdf" || ["jpg", "jpeg", "png", "heic", "webp"].includes(extension);
            const estMs = estimateQuickScanMs(file.size);

            return {
                basic: {
                    id: generateDocumentId(file),
                    fileName: file.name,
                    extension,
                    sizeBytes: file.size,
                    uploadedAt: now,
                    sourcePath: (file as any).webkitRelativePath || null,
                    scan: {
                        phase: "queued",
                        estimatedQuickMs: estMs,
                        errorMessage: null
                    },
                    ocrEligible
                },
                metadata: {},
                keyData: {},
                classificationConfidence: 0.1 // Low confidence initially
            };
        });

        // Update items and scanJob
        setItems(prev => [...prev, ...newDocs]);

        setScanJob(prev => {
            const totalFiles = prev.totalFiles + newDocs.length; // Accumulate or reset? Usually accumulate if job running.
            // If we want to treat this *ingest* as part of a job, we add to total.
            // If job was idle, we start new.
            const isAlreadyScanning = prev.isScanning;
            const processedFiles = isAlreadyScanning ? prev.processedFiles : prev.processedFiles; // Actually, if we add docs, they are unpaid.
            // Wait, 'processedFiles' counts 'completed/deep-scannable'.
            // We know newDocs are queued, so they are NOT processed.

            // Let's assume prev.processedFiles is correct for existing items. 
            // We just add to totalFiles.

            // Simple logic:
            const currentTotal = items.length + newDocs.length;
            const pending = currentTotal - processedFiles; // roughly
            const estMsPerFile = 500;

            return {
                isScanning: true,
                totalFiles: currentTotal,
                processedFiles: processedFiles,
                startedAt: prev.startedAt ?? new Date().toISOString(),
                estimatedMsRemaining: pending * estMsPerFile
            };
        });

        // Trigger processing loop
        // processQueuedDocuments() is internal and will be triggered by useEffect watching items/scanJob state,
        // OR we can explicitly call a function that sets a timeout.
        // Prompt asks: "2.5. Crear una función interna processQueuedDocuments que Se llame al final de ingestFiles".
        // Since state updates are async, invoking it directly might not see new items immediately unless we pass them or wait.
        // However, the cleanest React way is useEffect. But following instructions strictly: I will call a function that *initiates* the loop if not running.

        startProcessingLoop();
    };

    const startProcessingLoop = () => {
        if (processingRef.current) return; // Already running

        // Slight delay to allow state to settle
        processingRef.current = window.setTimeout(processQueuedDocuments, 100);
    };

    const processQueuedDocuments = () => {
        setItems(currentItems => {
            // Find queued items
            const queuedIndices = currentItems
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => item.basic.scan.phase === "queued");

            if (queuedIndices.length === 0) {
                // No more items to process
                processingRef.current = null;

                // Mark job as finished in separate state update
                setScanJob(prev => ({
                    ...prev,
                    isScanning: false,
                    estimatedMsRemaining: null
                }));
                return currentItems;
            }

            // Process batch (e.g. 3)
            const batchSize = 3;
            const processingBatch = queuedIndices.slice(0, batchSize);

            // We need to know how long to wait for THIS batch simulation.
            // Max estimatedQuickMs of the batch?
            const maxWait = Math.max(...processingBatch.map(x => x.item.basic.scan.estimatedQuickMs || 500), 500);

            // Schedule next tick
            processingRef.current = window.setTimeout(processQueuedDocuments, maxWait);

            // Update Scan Job Metrics immediately (optimistic update of progress text)
            // Note: We can't easily update 'scanJob' state inside this 'setItems' callback derived logic nicely without separate effect,
            // but we can schedule a setScanJob.

            // Return updated items: mark them as "deep-scannable" (completed quick scan) directly for simplicity,
            // OR mark them "quick-scanning" then "completed" in next tick.
            // Title says: "quick-scanning" -> "deep-scannable".
            // To keep it simple and effective:
            // Mark currently queued as "deep-scannable" directly implies they ARE processed.
            // If we want to show "Scanning...", we should have marked them "quick-scanning" BEFORE the timeout.

            // Improved flow:
            // 1. Find "queued".
            // 2. Mark top 3 as "quick-scanning".
            // 3. Wait.
            // 4. Mark those as "deep-scannable" AND find next 3 "queued".

            // This requires state transition.
            return currentItems.map((doc, idx) => {
                if (processingBatch.some(pb => pb.index === idx)) {
                    return {
                        ...doc,
                        basic: {
                            ...doc.basic,
                            scan: { ...doc.basic.scan, phase: "deep-scannable" }
                        }
                    };
                }
                return doc;
            });
        });

        // Update metrics after batch processed
        setScanJob(prev => {
            const newProcessed = prev.processedFiles + 3; // roughly
            const safeProcessed = Math.min(newProcessed, prev.totalFiles);
            const pending = prev.totalFiles - safeProcessed;

            return {
                ...prev,
                processedFiles: safeProcessed,
                estimatedMsRemaining: pending > 0 ? pending * 500 : 0
            };
        });
    };

    return {
        items,
        filtered,
        filters,
        selectedId,
        scanJob,
        setFilters,
        selectDocument,
        setMockDocuments,
        clearAll,
        ingestFiles,
        resetScanJob,
        requestDeepScan
    };
}
