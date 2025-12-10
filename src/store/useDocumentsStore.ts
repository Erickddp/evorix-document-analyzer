import { useState, useMemo, useEffect, useRef } from 'react';
import type {
    DocumentAnalysis,
    DocumentsFilters,
    DocumentKind,
    ScanJobMetrics,
} from '../types/documents';

import { quickExtractFromFile } from "../modules/extractor/extractor.mock";
import { extractBasicMetadata } from "../modules/metadata/metadata.mock";
import { classifyDocument } from "../modules/classifier/classifier.mock";

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

    // Ref to hold actual File objects
    const fileBufferRef = useRef<Map<string, File>>(new Map());

    // Effect to trigger queuing if items are added and loop not running
    useEffect(() => {
        if (scanJob.isScanning && !processingRef.current) {
            startProcessingLoop();
        }
    }, [items, scanJob.isScanning]);

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
        fileBufferRef.current.clear();
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
            const id = generateDocumentId(file);

            // Store file in buffer
            fileBufferRef.current.set(id, file);

            return {
                basic: {
                    id,
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
                    ocrEligible,
                    kind // required property
                },
                metadata: {},
                keyData: {},
                classificationConfidence: 0.1 // Low confidence initially
            };
        });

        // Update items and scanJob
        setItems(prev => [...prev, ...newDocs]);

        setScanJob(prev => {
            const isAlreadyScanning = prev.isScanning;
            const processedFiles = isAlreadyScanning ? prev.processedFiles : prev.processedFiles;

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

        // Start loop will happen via Effect or manual trigger
        startProcessingLoop();
    };

    const startProcessingLoop = () => {
        if (processingRef.current) return; // Already running

        // Slight delay to allow state to settle
        processingRef.current = window.setTimeout(processQueuedDocuments, 100);
    };

    const processQueuedDocuments = () => {
        // 1. Mark batch as "quick-scanning"
        // 2. Trigger runBatchExtraction
        setItems(currentItems => {
            const queued = currentItems.filter(d => d.basic.scan.phase === "queued");
            const batch = queued.slice(0, 3); // Max 3 at a time

            if (batch.length === 0) {
                // No more items
                if (processingRef.current) {
                    processingRef.current = null;
                }
                // IMPORTANT: Updating state here might be tricky if we want to stop scanJob too.
                // We'll let runBatchExtraction handle final cleanup if empty.
                return currentItems;
            }

            return currentItems.map(doc => {
                if (batch.some(b => b.basic.id === doc.basic.id)) {
                    return {
                        ...doc,
                        basic: {
                            ...doc.basic,
                            scan: { ...doc.basic.scan, phase: "quick-scanning" }
                        }
                    };
                }
                return doc;
            });
        });

        // We need to defer this slightly so state updates
        setTimeout(() => {
            void runBatchExtraction();
        }, 50);
    };

    const runBatchExtraction = async () => {
        // We need to get the items from state. Ideally use a ref or setState callback to read.
        // Since we are in a closure, we can't reliably read 'items' variable.
        // We must use setItems to get access to current state 'prev'.

        let docsToProcess: DocumentAnalysis[] = [];

        // Hack to read state inside async function without being inside a component render cycle properly?
        // Actually, setScanJob(prev => ...) gives us access.
        // Let's use setItems to "read" state and not change it effectively, or change it as we process.

        // To properly implement "async function runBatchExtraction" that reads state:
        // It's recursive.

        setItems(prevItems => {
            docsToProcess = prevItems.filter(doc => doc.basic.scan.phase === "quick-scanning");
            return prevItems; // No change yet
        });

        if (docsToProcess.length === 0) {
            // Check if any queued left?
            setItems(prevItems => {
                const queued = prevItems.filter(d => d.basic.scan.phase === "queued");
                if (queued.length === 0) {
                    setScanJob(job => ({ ...job, isScanning: false, estimatedMsRemaining: 0 }));
                    if (processingRef.current) processingRef.current = null;
                } else {
                    // Continue loop
                    if (!processingRef.current) {
                        processingRef.current = window.setTimeout(processQueuedDocuments, 50);
                    } else {
                        // reset?
                        clearTimeout(processingRef.current);
                        processingRef.current = window.setTimeout(processQueuedDocuments, 50);
                    }
                }
                return prevItems;
            });
            return;
        }

        // Process them
        for (const doc of docsToProcess) {
            const file = fileBufferRef.current.get(doc.basic.id);
            if (!file) {
                setItems(prev => prev.map(d => d.basic.id === doc.basic.id ?
                    { ...d, basic: { ...d.basic, scan: { ...d.basic.scan, phase: "error", errorMessage: "File lost" } } }
                    : d));
                continue;
            }

            try {
                const { metadata } = extractBasicMetadata(file, doc.basic);
                const extractor = await quickExtractFromFile(file, doc.basic);
                // Wait a bit to simulate processing time visually if it was too fast
                if (extractor.keyData.rfcs && extractor.keyData.rfcs.length === 0) {
                    await new Promise(r => setTimeout(r, 200));
                }
                const classifier = classifyDocument(doc.basic, extractor.keyData, metadata);

                setItems(prev => prev.map(d => {
                    if (d.basic.id !== doc.basic.id) return d;
                    return {
                        ...d,
                        basic: {
                            ...d.basic,
                            kind: classifier.kind,
                            scan: { ...d.basic.scan, phase: "completed", errorMessage: null }
                        },
                        metadata,
                        keyData: extractor.keyData,
                        classificationConfidence: classifier.confidence
                    };
                }));

                // Update progress
                setScanJob(prev => {
                    const processed = prev.processedFiles + 1;
                    const pending = Math.max(prev.totalFiles - processed, 0);
                    return {
                        ...prev,
                        processedFiles: processed,
                        estimatedMsRemaining: pending * 500
                    };
                });

            } catch (err) {
                setItems(prev => prev.map(d => d.basic.id === doc.basic.id ?
                    { ...d, basic: { ...d.basic, scan: { ...d.basic.scan, phase: "error", errorMessage: "Processing failed" } } }
                    : d));
            }
        }

        // After processing this batch, trigger next
        if (processingRef.current) {
            clearTimeout(processingRef.current);
        }
        processingRef.current = window.setTimeout(processQueuedDocuments, 50);
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
