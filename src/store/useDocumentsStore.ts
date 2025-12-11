import { useState, useEffect } from 'react';
import type {
    DocumentAnalysis,
    DocumentsFilters,
    DocumentKind,
    ScanJobMetrics,
} from '../types/documents';

import { quickExtractFromFile } from "../modules/extractor/extractor.mock";
import { extractBasicMetadata, extractDeepMetadata, type MetadataResultRaw } from "../modules/metadata/metadata.mock";
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
        case 'xml': return 'factura';
        case 'pdf': return 'documento_general';
        case 'doc': case 'docx': return 'documento_general';
        case 'xls': case 'xlsx': return 'datos_tabulares';
        case 'ppt': case 'pptx': return 'presentacion';
        case 'jpg': case 'jpeg': case 'png': return 'imagen';
        default: return 'desconocido';
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
        const k = doc.basic.kind || 'desconocido';
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
                const rawMeta = await extractBasicMetadata(doc);
                const metadata = normalizeMetadataBasic(rawMeta);
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
        const doc = storeState.items.find(d => d.basic.id === docId);
        if (!doc) return;

        const file = fileBuffer.get(docId);
        if (!file) {
            console.error('[Store] File buffer missing for:', docId);
            return;
        }

        try {
            // Reusing logic from batch extraction
            const extractor = await quickExtractFromFile(file, doc.basic);

            const newItems = storeState.items.map(d => {
                if (d.basic.id !== docId) return d;
                return {
                    ...d,
                    keyData: {
                        ...extractor.keyData,
                        hasQuickScan: true
                    },
                    // Optional: Update scan phase if needed, though UI uses keyData flags mostly
                    basic: {
                        ...d.basic,
                        scan: { ...d.basic.scan, phase: "completed" as const, errorMessage: null }
                    }
                };
            });
            storeState = { ...storeState, items: newItems };
            emitChange();
        } catch (error) {
            console.error('[KeyData] Quick scan error', error);
            const newItems = storeState.items.map(d => d.basic.id === docId ? { ...d, basic: { ...d.basic, scan: { ...d.basic.scan, phase: "error" as const, errorMessage: String(error) } } } : d);
            storeState = { ...storeState, items: newItems };
            emitChange();
        }
    };

    const runKeyDataFullScan = async (docId: string) => {
        const doc = storeState.items.find(d => d.basic.id === docId);
        if (!doc) return;

        // Mock LLM Response
        const simulatedLLMKeyData = {
            extracted: {
                rfcs: ["XAXX010101000"],
                dates: ["2024-01-05"],
                amounts: [5392.00],
                names: ["EMPRESA DEMO SA DE CV", "CLIENTE PRUEBA"],
                keys: ["FACTURA-123", "AUTH-999"]
            },
            score: 0.92,
            tags: ["financial", "invoice", "regex-validated"]
        };

        await new Promise(r => setTimeout(r, 600)); // Sim delay

        const newItems = storeState.items.map(d => {
            if (d.basic.id !== docId) return d;
            return {
                ...d,
                keyData: {
                    ...d.keyData,
                    rfcs: Array.from(new Set([...d.keyData.rfcs, ...simulatedLLMKeyData.extracted.rfcs])),
                    dates: Array.from(new Set([...d.keyData.dates, ...simulatedLLMKeyData.extracted.dates])),
                    amounts: Array.from(new Set([...d.keyData.amounts, ...simulatedLLMKeyData.extracted.amounts])),
                    names: Array.from(new Set([...d.keyData.names, ...simulatedLLMKeyData.extracted.names])),
                    keys: Array.from(new Set([...d.keyData.keys, ...simulatedLLMKeyData.extracted.keys])),
                    score: simulatedLLMKeyData.score,
                    tags: simulatedLLMKeyData.tags,
                    hasFullContent: true
                }
            };
        });
        storeState = { ...storeState, items: newItems };
        emitChange();
    };

    const requestDeepScan = (docId: string) => {
        console.log("Deep scan requested", docId);
    };

    const exportKeyDataCsv = (ids: string[]) => {
        const targetDocs = storeState.items.filter(d => ids.includes(d.basic.id));
        if (targetDocs.length === 0) return "";

        const allKeys = new Set<string>(["FileName", "Kind", "Score", "Tags", "RFCs", "Dates", "Amounts", "Names"]);

        let csv = Array.from(allKeys).join(",") + "\n";

        targetDocs.forEach(doc => {
            const row = [
                doc.basic.fileName,
                doc.basic.kind,
                doc.keyData.score ? (doc.keyData.score * 100).toFixed(0) + "%" : "",
                doc.keyData.tags ? `"${doc.keyData.tags.join(';')}"` : "",
                `"${doc.keyData.rfcs.join(';')}"`,
                `"${doc.keyData.dates.join(';')}"`,
                `"${doc.keyData.amounts.join(';')}"`,
                `"${doc.keyData.names.join(';')}"`
            ];
            csv += row.join(",") + "\n";
        });
        return csv;
    };

    const runMetadataBasicScan = async (documentId: string) => {
        const { items } = storeState; // access current state
        const target = items.find(d => d.basic.id === documentId);
        if (!target) return;

        try {
            console.log('[Metadata] L1 basic scan for', documentId);
            const raw = await extractBasicMetadata(target);
            const normalized = normalizeMetadataBasic(raw);

            setStoreState(state => ({
                items: state.items.map(doc =>
                    doc.basic.id === documentId
                        ? {
                            ...doc,
                            metadata: {
                                ...(doc.metadata || {}),
                                ...normalized,
                                hasBasicScan: true,
                                levels: {
                                    ...(doc.metadata?.levels || {}),
                                    l1: true,
                                },
                            },
                        }
                        : doc
                ),
            }));
        } catch (error) {
            console.error('[Metadata] L1 scan error', error);
        }
    };

    const runMetadataDeepScan = async (documentId: string) => {
        const { items } = storeState;
        const target = items.find(d => d.basic.id === documentId);
        if (!target) return;

        try {
            console.log('[Metadata] L2 deep scan for', documentId);
            const raw = await extractDeepMetadata(target);
            const normalized = normalizeMetadataDeep(raw);

            setStoreState(state => ({
                items: state.items.map(doc =>
                    doc.basic.id === documentId
                        ? {
                            ...doc,
                            metadata: {
                                ...(doc.metadata || {}),
                                ...normalized,
                                hasDeepScan: true,
                                hasBasicScan: true, // Deep usually implies basic is also done or available
                                levels: {
                                    ...(doc.metadata?.levels || {}),
                                    l1: true,
                                    l2: true,
                                },
                            },
                        }
                        : doc
                ),
            }));
        } catch (error) {
            console.error('[Metadata] L2 scan error', error);
        }
    };

    const exportMetadataCsv = (documentIds: string[]) => {
        const { items } = storeState;
        const selected = documentIds.length
            ? items.filter(d => documentIds.includes(d.basic.id))
            : items;

        const rows = selected.map(doc => {
            const m = doc.metadata || {};
            return {
                id: doc.basic.id,
                name: doc.basic.fileName,
                size: m.fileSize ?? doc.basic.sizeBytes,
                mimeType: m.mimeType,
                createdAt: m.createdAt,
                updatedAt: m.modifiedAt, // mapping updatedAt from prompt to modifiedAt
                author: m.author,
                owner: m.owner,
                location: m.location,
                pages: m.pageCount, // mapped from pages
                device: m.device,
                appName: m.appName,
            };
        });

        const csv = buildCsvFromObjects(rows);
        downloadCsvFile(csv, `evorix_metadata_${Date.now()}.csv`);
    };

    // Helper functions for updating state safely
    const setStoreState = (updater: (state: GlobalState) => Partial<GlobalState>) => {
        const partial = updater(storeState);
        storeState = { ...storeState, ...partial, summary: buildSummaryFromItems(partial.items || storeState.items) };
        emitChange();
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

    const exportDocumentSummaryCsv = (docId: string) => {
        const doc = storeState.items.find(d => d.basic.id === docId);
        if (!doc) {
            console.log('Document not found for export:', docId);
            return;
        }

        // Helper to escape CSV strings
        const esc = (val: any) => {
            if (val === null || val === undefined) return "";
            const s = String(val);
            if (s.includes(",") || s.includes("\n") || s.includes('"')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };

        // Helper for arrays
        const list = (arr: any[]) => esc(arr.join('; '));

        const headers = [
            "fileName", "extension", "sizeBytes", "kind", "uploadedAt",
            "rfcs", "dates", "mainAmount", "names",
            "mime_type", "file_size", "pages", "created_at", "updated_at",
            "author", "owner", "software", "device", "app_name", "location", "gps",
            "meta_l1", "meta_l2",
            "classification", "classificationConfidence",
            "ocrPreview"
        ];

        const amounts = doc.keyData.amounts || [];
        const mainAmount = amounts.length > 0 ? Math.max(...amounts) : "";

        const gpsStr = doc.metadata.gpsCoordinates
            ? `${doc.metadata.gpsCoordinates.lat},${doc.metadata.gpsCoordinates.lng}`
            : "";

        const row = [
            esc(doc.basic.fileName),
            esc(doc.basic.extension),
            doc.basic.sizeBytes,
            esc(doc.basic.kind),
            esc(doc.basic.uploadedAt),
            list(doc.keyData.rfcs),
            list(doc.keyData.dates),
            mainAmount,
            list(doc.keyData.names),
            esc(doc.metadata.mimeType), // Mime type
            doc.metadata.fileSize ?? "", // File size
            doc.metadata.pageCount ?? "", // Paginas
            esc(doc.metadata.createdAt),
            esc(doc.metadata.modifiedAt), // Modificado en
            esc(doc.metadata.author), // Autor
            esc(doc.metadata.owner), // Propietario
            esc(doc.metadata.software), // Software
            esc(doc.metadata.device), // Dispositivo
            esc(doc.metadata.appName), // App Origen
            esc(doc.metadata.location), // Ubicacion
            esc(gpsStr),
            doc.metadata.levels?.l1 ? "true" : "false", // meta_l1
            doc.metadata.levels?.l2 ? "true" : "false", // meta_l2
            esc(doc.basic.kind),
            (doc.classificationConfidence * 100).toFixed(0) + "%",
            esc(doc.ocrInfo?.rawTextPreview?.slice(0, 120) || "")
        ];

        const csvString = headers.join(",") + "\n" + row.join(",");

        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `evorix_document_summary_${doc.basic.fileName}.csv`;
        link.click();
        URL.revokeObjectURL(url);
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
        exportDocumentSummaryCsv,
        runMetadataBasicScan,
        runMetadataDeepScan,
        exportMetadataCsv,
        reclassifyDocument,
        exportClassificationCsv,
        runOcrForDocument,
        startProcessing
    };
}

// --- Helper Functions ---

function normalizeMetadataBasic(raw: MetadataResultRaw) {
    return {
        // Map raw fields to DocumentMetadata
        mimeType: raw.mimeType,
        fileSize: raw.fileSize,
        createdAt: raw.createdAt,
        modifiedAt: raw.updatedAt,
    };
}

function normalizeMetadataDeep(raw: MetadataResultRaw) {
    return {
        author: raw.author,
        owner: raw.owner,
        software: raw.software,
        device: raw.device,
        location: raw.location,
        appName: raw.appName,
        pageCount: raw.pages,
        gpsCoordinates: raw.gps ? parseGps(raw.gps as any) : undefined,
        exifCamera: raw.device,
        exifLocation: raw.location,
    };
}

function parseGps(gpsStr: string): { lat: number; lng: number } | undefined {
    try {
        const parts = gpsStr.split(',').map(s => parseFloat(s.replace(/[^\d.-]/g, '')));
        if (parts.length >= 2) return { lat: parts[0], lng: parts[1] };
    } catch { }
    return undefined;
}

function buildCsvFromObjects(rows: any[]): string {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const csvRows = [
        headers.join(','),
        ...rows.map(row => headers.map(header => {
            const val = row[header] ?? "";
            const escaped = String(val).replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(','))
    ];
    return csvRows.join('\n');
}

function downloadCsvFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

