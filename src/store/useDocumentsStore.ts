import { useState, useEffect } from 'react';
import type {
    DocumentAnalysis,
    DocumentsFilters,
    DocumentKind,
    ScanJobMetrics,
} from '../types/documents';

import { quickExtractFromFile } from "../modules/extractor/extractor.mock";
import { extractBasicMetadata } from "../modules/metadata/metadata.mock";
import { classifyDocument } from "../modules/classifier/classifier.mock";

// --- Types ---

export type ScanSummary = {
    totalDocs: number;
    detectedTypes: number;
    docsWithMetadataPct: number;
    totalSizeBytes: number;
    distributionByType: { label: string; count: number }[];
    topExtensions: { ext: string; count: number }[];
};

// MOCK_DOCS removed as per request to rely solely on store


// --- Initial Constants ---

const DEFAULT_FILTERS: DocumentsFilters = { search: "", kind: "all", hasMetadata: "all", sizeBucket: "all" };

const DEFAULT_SCAN_JOB: ScanJobMetrics = { isScanning: false, totalFiles: 0, processedFiles: 0, startedAt: null, estimatedMsRemaining: null };

const DEFAULT_SUMMARY: ScanSummary = { totalDocs: 0, detectedTypes: 0, docsWithMetadataPct: 0, totalSizeBytes: 0, distributionByType: [], topExtensions: [] };

// --- Singleton State ---

const fileBuffer = new Map<string, File>();
let processingTimer: number | null = null;

type GlobalState = {
    items: DocumentAnalysis[];
    filters: DocumentsFilters;
    selectedId: string | null;
    scanJob: ScanJobMetrics;
    summary: ScanSummary;
};

let storeState: GlobalState = {
    items: [],
    filters: DEFAULT_FILTERS,
    selectedId: null,
    scanJob: DEFAULT_SCAN_JOB,
    summary: DEFAULT_SUMMARY
};

const listeners = new Set<(state: GlobalState) => void>();

function emitChange() {
    for (const listener of listeners) {
        listener(storeState);
    }
}

// --- Helpers ---

function inferKindFromExtension(ext: string): DocumentKind {
    switch (ext) {
        case 'xml': return 'invoice';
        case 'pdf': return 'report';
        case 'doc': case 'docx': return 'letter';
        case 'xls': case 'xlsx': return 'report';
        case 'jpg': case 'jpeg': case 'png': return 'other';
        default: return 'unknown';
    }
}

function estimateQuickScanMs(sizeBytes: number): number {
    if (sizeBytes < 1024 * 1024) return 200 + Math.random() * 200;
    if (sizeBytes < 10 * 1024 * 1024) return 500 + Math.random() * 1000;
    return 2000 + Math.random() * 2000;
}

function generateDocumentId(file: File): string {
    return `${Date.now()}-${file.name.replace(/\s+/g, '_')}-${Math.floor(Math.random() * 1000)}`;
}

function buildSummaryFromItems(items: DocumentAnalysis[]): ScanSummary {
    const totalDocs = items.length;
    if (totalDocs === 0) return DEFAULT_SUMMARY;

    const kindCount: Record<string, number> = {};
    const extCount: Record<string, number> = {};
    let withMetadataCount = 0;
    let totalSizeBytes = 0;

    items.forEach(doc => {
        const k = doc.basic.kind || 'unknown';
        kindCount[k] = (kindCount[k] || 0) + 1;
        const ext = (doc.basic.extension || 'other').toUpperCase();
        extCount[ext] = (extCount[ext] || 0) + 1;
        if (Object.keys(doc.metadata).length > 0) withMetadataCount++;
        totalSizeBytes += doc.basic.sizeBytes;
    });

    const uniqueTypes = Object.keys(kindCount).length;
    const docsWithMetadataPct = Math.round((withMetadataCount / totalDocs) * 100);

    const distributionByType = Object.entries(kindCount).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    const topExtensions = Object.entries(extCount).map(([ext, count]) => ({ ext, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    return { totalDocs, detectedTypes: uniqueTypes, docsWithMetadataPct, totalSizeBytes, distributionByType, topExtensions };
}

// Init summary
storeState.summary = buildSummaryFromItems(storeState.items);

// --- Store Hook ---

export function useDocumentsStore() {
    const [state, setState] = useState(storeState);

    useEffect(() => {
        const listener = (newState: GlobalState) => setState({ ...newState });
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);

    const filtered = state.items.filter(doc => {
        if (state.filters.search) {
            const q = state.filters.search.toLowerCase();
            const matchName = doc.basic.fileName.toLowerCase().includes(q);
            const matchKey = Object.values(doc.keyData).some(arr => Array.isArray(arr) && arr.some((v: any) => String(v).toLowerCase().includes(q)));
            if (!matchName && !matchKey) return false;
        }
        if (state.filters.kind !== "all" && doc.basic.kind !== state.filters.kind) return false;
        if (state.filters.hasMetadata !== "all") {
            const hasMeta = Object.keys(doc.metadata).length > 0;
            if (state.filters.hasMetadata === "yes" && !hasMeta) return false;
            if (state.filters.hasMetadata === "no" && hasMeta) return false;
        }
        if (state.filters.sizeBucket !== "all") {
            const size = doc.basic.sizeBytes;
            if (state.filters.sizeBucket === "small" && size > 1024 * 1024) return false;
            if (state.filters.sizeBucket === "medium" && (size <= 1024 * 1024 || size > 10 * 1024 * 1024)) return false;
            if (state.filters.sizeBucket === "large" && size <= 10 * 1024 * 1024) return false;
        }
        return true;
    });

    // Actions
    const setFilters = (partial: Partial<DocumentsFilters>) => {
        storeState = { ...storeState, filters: { ...storeState.filters, ...partial } };
        emitChange();
    };

    const selectDocument = (id: string | null) => {
        storeState = { ...storeState, selectedId: id };
        emitChange();
    };

    const setMockDocuments = (docs: DocumentAnalysis[]) => {
        storeState = { ...storeState, items: docs, summary: buildSummaryFromItems(docs) };
        emitChange();
        resetScanJob();
    };

    const clearAll = () => {
        storeState = { ...storeState, items: [], selectedId: null, scanJob: DEFAULT_SCAN_JOB, summary: DEFAULT_SUMMARY };
        storeState.filters = DEFAULT_FILTERS;
        fileBuffer.clear();
        if (processingTimer) { clearTimeout(processingTimer); processingTimer = null; }
        emitChange();
    };

    const resetScanJob = () => {
        storeState = { ...storeState, scanJob: { isScanning: false, totalFiles: storeState.items.length, processedFiles: storeState.items.length, startedAt: null, estimatedMsRemaining: null } };
        emitChange();
    };

    const ingestFiles = async (files: FileList | File[]) => {
        try {
            const filesArray = Array.from(files).filter(f => f.size > 0);
            console.log('[Store] ingestFiles called with', filesArray.length, 'files');
            if (filesArray.length === 0) return;
            const now = new Date().toISOString();

            const newDocs: DocumentAnalysis[] = filesArray.map(file => {
                const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
                const kind = inferKindFromExtension(extension);
                const estMs = estimateQuickScanMs(file.size);
                const id = generateDocumentId(file);
                fileBuffer.set(id, file);

                return {
                    basic: {
                        id, fileName: file.name, extension, sizeBytes: file.size, uploadedAt: now, sourcePath: (file as any).webkitRelativePath || null,
                        scan: { phase: "queued" as const, estimatedQuickMs: estMs, errorMessage: null },
                        ocrEligible: extension === "pdf" || ["jpg", "jpeg", "png"].includes(extension), kind
                    },
                    metadata: {}, keyData: { names: [], rfcs: [], dates: [], amounts: [], keys: [] }, classificationConfidence: 0.1
                };
            });

            const updated = [...storeState.items, ...newDocs];
            storeState = { ...storeState, items: updated, summary: buildSummaryFromItems(updated) };
            console.log('[Store] ingestFiles added', newDocs.length, 'docs. Total:', updated.length);
            emitChange();
        } catch (error) { console.error('[Store] ingestFiles ERROR:', error); }
    };

    const startProcessing = () => {
        if (storeState.scanJob.isScanning) { console.log('[Store] already scanning'); return; }
        const hasQueued = storeState.items.some(d => d.basic.scan.phase === "queued");
        if (!hasQueued) return;

        storeState = { ...storeState, scanJob: { ...storeState.scanJob, isScanning: true, startedAt: new Date().toISOString() } };
        emitChange();
        startProcessingLoop();
    };

    const startProcessingLoop = () => {
        if (processingTimer) return;
        processingTimer = window.setTimeout(processQueuedDocuments, 100);
    };

    const processQueuedDocuments = () => {
        const queued = storeState.items.filter(d => d.basic.scan.phase === "queued");
        const batch = queued.slice(0, 3);
        if (batch.length === 0) { if (processingTimer) processingTimer = null; return; }

        const newItems = storeState.items.map(doc => {
            if (batch.some(b => b.basic.id === doc.basic.id)) {
                return { ...doc, basic: { ...doc.basic, scan: { ...doc.basic.scan, phase: "quick-scanning" as const } } };
            }
            return doc;
        });
        storeState = { ...storeState, items: newItems };
        emitChange();
        setTimeout(() => { void runBatchExtraction(); }, 50);
    };

    const runBatchExtraction = async () => {
        const docsToProcess = storeState.items.filter(d => d.basic.scan.phase === "quick-scanning");

        if (docsToProcess.length === 0) {
            const queued = storeState.items.filter(d => d.basic.scan.phase === "queued");
            if (queued.length === 0) {
                storeState = {
                    ...storeState,
                    scanJob: { ...storeState.scanJob, isScanning: false, estimatedMsRemaining: 0 },
                    summary: buildSummaryFromItems(storeState.items)
                };
                if (processingTimer) processingTimer = null;
                emitChange();
            } else {
                if (processingTimer) clearTimeout(processingTimer);
                processingTimer = window.setTimeout(processQueuedDocuments, 50);
            }
            return;
        }

        for (const doc of docsToProcess) {
            const file = fileBuffer.get(doc.basic.id);
            if (!file) {
                const newItems = storeState.items.map(d => d.basic.id === doc.basic.id ? { ...d, basic: { ...d.basic, scan: { ...d.basic.scan, phase: "error" as const, errorMessage: "File lost" } } } : d);
                storeState = { ...storeState, items: newItems };
                emitChange();
                continue;
            }

            try {
                const { metadata } = extractBasicMetadata(file, doc.basic);
                const extractor = await quickExtractFromFile(file, doc.basic);
                await new Promise(r => setTimeout(r, 100)); // Sim delay
                const classifier = classifyDocument(doc.basic, extractor.keyData, metadata);

                const newItems = storeState.items.map(d => {
                    if (d.basic.id !== doc.basic.id) return d;
                    return {
                        ...d,
                        basic: { ...d.basic, kind: classifier.kind, scan: { ...d.basic.scan, phase: "completed" as const, errorMessage: null } },
                        metadata,
                        keyData: extractor.keyData,
                        classificationConfidence: classifier.confidence
                    };
                });
                const processed = storeState.scanJob.processedFiles + 1;
                const pending = Math.max(storeState.scanJob.totalFiles - processed, 0);

                storeState = {
                    ...storeState,
                    items: newItems,
                    scanJob: { ...storeState.scanJob, processedFiles: processed, estimatedMsRemaining: pending * 500 }
                };
                emitChange();
            } catch (err) {
                const newItems = storeState.items.map(d => d.basic.id === doc.basic.id ? { ...d, basic: { ...d.basic, scan: { ...d.basic.scan, phase: "error" as const } } } : d);
                storeState = { ...storeState, items: newItems };
                emitChange();
            }
        }
        if (processingTimer) clearTimeout(processingTimer);
        processingTimer = window.setTimeout(processQueuedDocuments, 50);
    };

    // --- Module Actions ---

    const runKeyDataQuickScan = async (docId: string) => {
        // Mock impl
        console.log("Quick scan", docId);
    };

    const runKeyDataFullScan = async (docId: string) => {
        console.log("Full scan", docId);
    };

    const requestDeepScan = (docId: string) => {
        console.log("Deep scan requested", docId);
    };

    const exportKeyDataCsv = (_ids: string[]) => {
        return "id,key,value\n1,mock,data";
    };

    const runMetadataBasicScan = async (docId: string) => {
        // const file = fileBuffer.get(docId);
        const newItems = storeState.items.map(d => {
            if (d.basic.id !== docId) return d;
            return {
                ...d,
                metadata: {
                    ...d.metadata,
                    author: d.metadata.author || "Unknown",
                    software: d.metadata.software || "EVORIX-Scanner",
                    createdAt: d.metadata.createdAt || d.basic.uploadedAt,
                    hasMetadataScan: true,
                    // If we had file info we could add mimeType etc here like in Step 131
                }
            };
        });
        storeState = { ...storeState, items: newItems, summary: buildSummaryFromItems(newItems) };
        emitChange();
    };

    const runMetadataDeepScan = async (docId: string) => {
        const newItems = storeState.items.map(d => {
            if (d.basic.id !== docId) return d;
            return {
                ...d,
                metadata: {
                    ...d.metadata,
                    hasDeepScan: true,
                    exifCamera: "Simulated Deep Scan Camera",
                    hasMetadataScan: true
                }
            };
        });
        storeState = { ...storeState, items: newItems, summary: buildSummaryFromItems(newItems) };
        emitChange();
    };

    const exportMetadataCsv = (_ids: string[]) => {
        return "fileName,author\nfile1.pdf,me";
    };

    const reclassifyDocument = async (docId: string) => {
        const newItems = storeState.items.map(d => {
            if (d.basic.id !== docId) return d;
            const res = classifyDocument(d.basic, d.keyData, d.metadata);
            return { ...d, basic: { ...d.basic, kind: res.kind }, classificationConfidence: res.confidence };
        });
        storeState = { ...storeState, items: newItems, summary: buildSummaryFromItems(newItems) };
        emitChange();
    };

    const exportClassificationCsv = (_ids: string[]) => "fileName,kind\n";

    const runOcrForDocument = async (docId: string) => {
        const newItems = storeState.items.map(d => {
            if (d.basic.id !== docId) return d;
            if (!d.basic.ocrEligible) return d;
            return {
                ...d,
                ocrInfo: {
                    hasOcrText: true,
                    engine: "EVORIX-OCR-MOCK",
                    processedAt: new Date().toISOString(),
                    rawTextPreview: "OCR Text..."
                }
            };
        });
        storeState = { ...storeState, items: newItems };
        emitChange();
    };

    return {
        items: state.items,
        filtered,
        filters: state.filters,
        selectedId: state.selectedId,
        scanJob: state.scanJob,
        summary: state.summary,
        setFilters,
        selectDocument,
        setMockDocuments,
        clearAll,
        ingestFiles,
        resetScanJob,
        requestDeepScan,
        runKeyDataQuickScan,
        runKeyDataFullScan,
        exportKeyDataCsv,
        runMetadataBasicScan,
        runMetadataDeepScan,
        exportMetadataCsv,
        reclassifyDocument,
        exportClassificationCsv,
        runOcrForDocument,
        startProcessing
    };
}
