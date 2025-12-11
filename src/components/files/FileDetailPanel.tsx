import { type DocumentAnalysis, DOCUMENT_KIND_LABEL_ES } from "../../types/documents";
import { useDocumentsStore } from "../../store/useDocumentsStore";

interface FileDetailPanelProps {
    document: DocumentAnalysis | null;
    // onKeyDataQuickScan removed in favor of direct store usage
    // onKeyDataQuickScan removed in favor of direct store usage
    // onKeyDataFullScan removed
    // onExportKeyDataCsv removed
    onMetadataBasicScan: (id: string) => void;
    onMetadataDeepScan: (id: string) => void;
    // onExportMetadataCsv: (ids: string[]) => void;
    onReclassify: (id: string) => void;
    onExportClassificationCsv: (ids: string[]) => void;
    onRunOcr: (id: string) => void;
}

export function FileDetailPanel({

    document,
    // onKeyDataQuickScan, -> removed
    // onKeyDataQuickScan, -> removed
    // onKeyDataFullScan, -> removed
    // onExportKeyDataCsv, -> removed
    onMetadataBasicScan,
    onMetadataDeepScan,
    // onExportMetadataCsv,
    onReclassify,
    // onExportClassificationCsv,
    onRunOcr
}: FileDetailPanelProps) {

    // Helper loading state
    const loadingAction: string = '';
    const {
        runKeyDataQuickScan: storeRunKeyDataQuickScan,
        runKeyDataFullScan: storeRunKeyDataFullScan,
        exportDocumentSummaryCsv,
        reclassifyDocument
    } = useDocumentsStore();

    // Helper functions inside component
    const handleAction = (_action: string, callback: () => void) => {
        callback();
    };

    if (!document) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 border-dashed">
                <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">Selecciona un archivo</p>
                <p className="text-sm">Para ver sus detalles y extraer datos</p>
            </div>
        );
    }

    // Destructure for easy access
    const { basic, metadata, keyData, classificationConfidence, ocrInfo } = document;
    const confidencePct = Math.round(classificationConfidence * 100);

    const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleString() : "—";
    const timeStr = (iso?: string) => iso ? new Date(iso).toLocaleTimeString() : '';

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-full overflow-hidden shadow-sm">
            {/* Header: Name and Actions */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${basic.scan.phase === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="text-xs font-mono text-slate-400">{basic.extension.toUpperCase()}</span>
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 rounded text-slate-500">
                            {confidencePct}% Conf.
                        </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate leading-tight" title={basic.fileName}>
                        {basic.fileName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        ID: {basic.id} • {(basic.sizeBytes / 1024).toFixed(1)} KB
                    </p>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">

                {/* Module: Key Data Extractor */}
                <ModuleCard title="Extracción de datos clave" description="Visualiza datos clave del documento.">
                    <div className="flex items-center gap-2 mb-3">
                        {keyData.hasQuickScan && (
                            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                                Analizado
                            </span>
                        )}
                        {keyData.hasFullContent && (
                            <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                                Contenido Completo
                            </span>
                        )}
                        {keyData.score !== undefined && (
                            <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                                Score: {(keyData.score * 100).toFixed(0)}%
                            </span>
                        )}
                        {keyData.tags && keyData.tags.map(tag => (
                            <span key={tag} className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {tag}
                            </span>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <ActionButton
                            onClick={() => {
                                if (!document) return;
                                storeRunKeyDataQuickScan(document.basic.id);
                            }}
                            label="Scan Rápido (Regex)"
                            loading={loadingAction === 'quick'}
                        />
                        <ActionButton
                            onClick={() => {
                                if (!document) return;
                                storeRunKeyDataFullScan(basic.id);
                            }}
                            label="Scan Completo (LLM*)"
                            loading={loadingAction === 'full'}
                        />
                        {/* Export CSV button removed
                        <ActionButton
                            onClick={() => {
                                if (!document) return;
                                const csv = storeExportKeyDataCsv([basic.id]);
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = window.URL.createObjectURL(blob);
                                const a = window.document.createElement('a');
                                a.href = url;
                                a.download = `evorix_keydata_export_${Date.now()}.csv`;
                                a.click();
                            }}
                            label="Export CSV"
                            secondary
                        />
                        */}
                    </div>

                    {/* Results Display */}
                    {(keyData.hasQuickScan || keyData.hasFullContent) ? (
                        <div className="space-y-3 mt-2">
                            <DataGroup label="Identificadores (RFCs/CURPs)" items={keyData.rfcs} emptyText="No se detectaron IDs." />
                            <DataGroup label="Fechas Clave" items={keyData.dates} emptyText="No se detectaron fechas." icon="📅" />
                            <DataGroup label="Montos ($)" items={keyData.amounts} emptyText="No se detectaron montos." icon="💰" color="text-emerald-600" />
                            <DataGroup label="Nombres / Entidades" items={keyData.names} emptyText="No se detectaron nombres." icon="👤" />
                        </div>
                    ) : (
                        <div className="text-center py-6 text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            Ejecuta un escaneo para ver datos clave.
                        </div>
                    )}
                </ModuleCard>

                {/* Module: Metadata Inspector */}
                <ModuleCard title="Inspector de metadatos" description="Análisis técnico de metadatos del archivo.">
                    <div className="flex items-center gap-2 mb-3">
                        {metadata.levels?.l1 && (
                            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                L1 Básico
                            </span>
                        )}
                        {metadata.levels?.l2 && (
                            <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                                L2 Profundo
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                        <ActionButton
                            onClick={() => handleAction('meta_l1', () => onMetadataBasicScan(basic.id))}
                            label="Escaneo básico (L1)"
                            loading={loadingAction === 'meta_l1'}
                        />
                        <ActionButton
                            onClick={() => handleAction('meta_l2', () => onMetadataDeepScan(basic.id))}
                            label="Escaneo profundo (L2)"
                            loading={loadingAction === 'meta_l2'}
                            disabled={!metadata.levels?.l1}
                        />
                        {/* <ActionButton
                            onClick={() => onExportMetadataCsv([basic.id])}
                            label="L3: Export CSV"
                            secondary
                        /> */}
                    </div>

                    {(metadata.levels?.l1 || metadata.hasBasicScan) && (
                        <div className="mt-2 text-sm space-y-4">
                            {/* Bloque Detalles de archivo */}
                            <div className="p-2 border rounded border-slate-100 dark:border-slate-800">
                                <p className="text-xs font-bold text-slate-400 mb-1">Detalles de archivo</p>
                                <Row label="Nombre" value={basic.fileName} />
                                <Row label="MIME Type" value={metadata.mimeType || "No disponible"} />
                                <Row label="Tamaño" value={metadata.fileSize ? `${(metadata.fileSize / 1024).toFixed(1)} KB` : `${(basic.sizeBytes / 1024).toFixed(1)} KB`} />
                                <Row label="Páginas" value={metadata.pageCount?.toString() || "No disponible"} />
                            </div>

                            {/* Bloque Fechas / cambios */}
                            <div className="p-2 border rounded border-slate-100 dark:border-slate-800">
                                <p className="text-xs font-bold text-slate-400 mb-1">Fechas / Cambios</p>
                                <Row label="Creado" value={formatDate(metadata.createdAt || undefined)} />
                                <Row label="Modificado" value={formatDate(metadata.modifiedAt || undefined)} />
                            </div>

                            {/* Bloque Autor / Propietario */}
                            {(metadata.levels?.l2 || metadata.hasDeepScan) && (
                                <div className="p-2 border rounded border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-400 mb-1">Autoría</p>
                                    <Row label="Autor" value={metadata.author || "No disponible"} />
                                    <Row label="Propietario" value={metadata.owner || "No disponible"} />
                                    <Row label="Software" value={metadata.software} />
                                </div>
                            )}

                            {/* Bloque Origen */}
                            {(metadata.levels?.l2 || metadata.hasDeepScan) && (
                                <div className="p-2 border rounded border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-400 mb-1">Origen</p>
                                    <Row label="Dispositivo" value={metadata.device || "No disponible"} />
                                    <Row label="App Origen" value={metadata.appName || "No disponible"} />
                                    <Row label="Ubicación" value={metadata.location || metadata.exifLocation || "No disponible"} />
                                    {metadata.gpsCoordinates && (
                                        <Row label="GPS" value={`${metadata.gpsCoordinates.lat}, ${metadata.gpsCoordinates.lng}`} />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </ModuleCard>

                {/* Module: Classifier */}
                <ModuleCard title="Clasificador de documentos" description="Se clasifica por tipo de archivo.">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold capitalize bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
                                {DOCUMENT_KIND_LABEL_ES[basic.kind] ?? basic.kind}
                            </span>
                            <span className="text-xs text-slate-500">
                                Coincidencia: {confidencePct}%
                            </span>
                        </div>
                        <ActionButton onClick={() => reclassifyDocument(basic.id)} label="Re-clasificar" secondary small />
                    </div>
                    {/* <ActionButton onClick={() => onExportClassificationCsv([basic.id])} label="" secondary small /> */}
                </ModuleCard>

                {/* Module: OCR */}
                <ModuleCard title="Extraccion de texto por OCR" description="Su foto o ticket se traduce en texto simple.">
                    <div className="flex flex-wrap gap-2 mb-3">
                        <ActionButton
                            onClick={() => onRunOcr(basic.id)}
                            label="Ejecutar OCR"
                            disabled={!basic.ocrEligible}
                        />
                    </div>
                    {ocrInfo?.hasOcrText && (
                        <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-800">
                            {ocrInfo.rawTextPreview}
                            <div className="mt-1 text-[10px] text-slate-400 text-right">
                                {ocrInfo.engine} • {timeStr(ocrInfo.processedAt || undefined)}
                            </div>
                        </div>
                    )}
                    {!basic.ocrEligible && <p className="text-xs text-slate-400 italic">Archivo no elegible para OCR.</p>}
                </ModuleCard>

                {/* New Global Export Button */}
                <div className="mt-8 mb-4">
                    <ActionButton
                        onClick={() => exportDocumentSummaryCsv(basic.id)}
                        label="Descargar resumen CSV"
                        disabled={!(metadata.hasBasicScan || keyData.hasQuickScan || keyData.hasFullContent || (ocrInfo?.hasOcrText))}
                        className="w-full text-sm py-3"
                    />
                </div>
            </div>
        </div>
    );
}

// --- Helpers internal components ---

function ModuleCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative group transition-colors hover:border-slate-300 dark:hover:border-slate-700">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-1">{title}</h3>
            <p className="text-xs text-slate-500 mb-4">{description}</p>
            {children}
        </div>
    );
}

interface ActionButtonProps {
    onClick: () => void;
    label: string;
    secondary?: boolean;
    small?: boolean;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
}

function ActionButton({ onClick, label, secondary, small, disabled, loading, className = '' }: ActionButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`
                flex items-center justify-center gap-2 rounded font-medium transition-colors
                ${small ? 'text-xs px-2 py-1' : 'text-xs px-3 py-2'}
                ${secondary
                    ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    : 'bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-600 shadow-sm'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${className}
            `}
        >
            {loading ? (
                <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : null}
            {label}
        </button>
    );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
    if (!value) return null;
    return (
        <div className="flex justify-between items-center py-0.5 border-b border-slate-50 dark:border-slate-900/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 px-1 rounded">
            <span className="text-slate-500 font-medium text-xs">{label}:</span>
            <span className="text-slate-700 dark:text-slate-300 font-mono text-xs truncate max-w-[65%] text-right" title={value}>{value}</span>
        </div>
    );
}

function DataGroup({ label, items, emptyText, icon, color = 'text-slate-700 dark:text-slate-300' }: { label: string; items: any[], emptyText?: string, icon?: string, color?: string }) {
    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                {icon} {label}
            </p>
            {items && items.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                    {items.slice(0, 10).map((item, idx) => (
                        <span key={idx} className={`text-xs px-1.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 font-mono truncate max-w-full ${color}`}>
                            {String(item)}
                        </span>
                    ))}
                    {items.length > 10 && (
                        <span className="text-[10px] text-slate-400 self-center">+{items.length - 10} más</span>
                    )}
                </div>
            ) : (
                <p className="text-xs text-slate-400 italic">{emptyText || "N/A"}</p>
            )}
        </div>
    );
}
