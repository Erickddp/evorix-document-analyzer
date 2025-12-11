import { type DocumentAnalysis } from '../../types/documents';
import { EmptyState } from '../common/EmptyState';
import { Tag } from '../common/Tag';
import { useState } from 'react';

interface FileDetailPanelProps {
    document: DocumentAnalysis | null;
    onKeyDataQuickScan: (id: string) => Promise<void>;
    onKeyDataFullScan: (id: string) => Promise<void>;
    onExportKeyDataCsv: (ids: string[]) => string;

    onMetadataBasicScan: (id: string) => Promise<void>;
    onMetadataDeepScan: (id: string) => Promise<void>;
    onExportMetadataCsv: (ids: string[]) => string;

    onReclassify: (id: string) => Promise<void>;
    onExportClassificationCsv: (ids: string[]) => string;
    onRunOcr: (id: string) => Promise<void>;
}

export function FileDetailPanel({
    document,
    onKeyDataQuickScan,
    onKeyDataFullScan,
    onExportKeyDataCsv,
    onMetadataBasicScan,
    onMetadataDeepScan,
    onExportMetadataCsv,
    onReclassify,
    onExportClassificationCsv,
    onRunOcr
}: FileDetailPanelProps) {
    const [showFullText, setShowFullText] = useState(false);
    // Simple loading state generic for this panel
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const handleAction = async (actionName: string, fn: () => Promise<void>) => {
        setLoadingAction(actionName);
        try { await fn(); }
        finally { setLoadingAction(null); }
    };

    if (!document) {
        return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 h-full min-h-[300px] flex items-center justify-center">
                <EmptyState
                    title="Sin selección"
                    subtitle="Selecciona un archivo para ver el HUB."
                    icon={
                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                    }
                />
            </div>
        );
    }

    const { basic, metadata, keyData, ocrInfo } = document;

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-full overflow-hidden shadow-sm">
            {/* 1. Header Summary */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 truncate" title={basic.fileName}>
                    {basic.fileName}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex gap-2">
                    <span>{(basic.sizeBytes / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span className="uppercase">{basic.extension}</span>
                    <span>•</span>
                    <span>{basic.kind}</span>
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                    <Tag color={basic.ocrEligible ? 'blue' : 'gray'}>OCR: {basic.ocrEligible ? 'Sí' : 'No'}</Tag>
                    <Tag color={basic.scan.phase === 'completed' ? 'green' : 'yellow'}>{basic.scan.phase}</Tag>
                    {(document.classificationConfidence > 0) && (
                        <Tag color="gray">Conf: {(document.classificationConfidence * 100).toFixed(0)}%</Tag>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30 dark:bg-slate-900/10">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Acciones Disponibles</h4>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">

                    {/* Module: Key Data Extractor */}
                    <ModuleCard title="Key Data Extractor" description="Extracción de entidades clave del documento.">
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
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            <ActionButton
                                onClick={() => handleAction('quick', () => onKeyDataQuickScan(basic.id))}
                                label="Scan Rápido (Regex)"
                                loading={loadingAction === 'quick'}
                            />
                            <ActionButton
                                onClick={() => handleAction('full', () => onKeyDataFullScan(basic.id))}
                                label="Scan Completo (LLM*)"
                                loading={loadingAction === 'full'}
                            />
                            <ActionButton onClick={() => onExportKeyDataCsv([basic.id])} label="Export CSV" secondary />
                        </div>

                        {/* Results Display */}
                        {keyData.hasQuickScan ? (
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
                    <ModuleCard title="Metadata Inspector" description="Análisis técnico de metadatos del archivo.">
                        <div className="flex items-center gap-2 mb-3">
                            {(metadata.hasBasicScan || metadata.hasDeepScan) && (
                                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {metadata.hasDeepScan ? 'L1 + L2' : 'L1'}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            <ActionButton
                                onClick={() => handleAction('meta_l1', () => onMetadataBasicScan(basic.id))}
                                label="L1: Scan Básico"
                                loading={loadingAction === 'meta_l1'}
                            />
                            <ActionButton
                                onClick={() => handleAction('meta_l2', () => onMetadataDeepScan(basic.id))}
                                label="L2: Deep Scan"
                                loading={loadingAction === 'meta_l2'}
                            />
                            <ActionButton onClick={() => onExportMetadataCsv([basic.id])} label="L3: Export CSV" secondary />
                        </div>

                        {metadata.hasBasicScan && (
                            <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-sm space-y-1">
                                <Row label="MIME Type" value={metadata.mimeType} />
                                <Row label="Software" value={metadata.software} />
                                <Row label="Creado" value={formatDate(metadata.createdAt)} />
                                <Row label="Modificado" value={formatDate(metadata.modifiedAt)} />
                                <Row label="Dispositivo" value={metadata.device} />

                                {(metadata.exifCamera || metadata.exifLocation) && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                        <p className="text-xs font-semibold text-slate-400 mb-1">EXIF Simulado</p>
                                        <Row label="Cámara" value={metadata.exifCamera} />
                                        <Row label="Ubicación" value={metadata.exifLocation} />
                                    </div>
                                )}
                            </div>
                        )}
                    </ModuleCard>

                    <span>{new Date(ocrInfo.processedAt || '').toLocaleTimeString()}</span>
                </div>
                <div className="whitespace-pre-wrap opacity-80 h-24 overflow-y-auto">
                    {ocrInfo.rawTextPreview}
                </div>
            </div>
                            )}
        </>
    )
}
                </ModuleCard >

    {/* Module: Exports */ }
    < ModuleCard title = "Export / Descargas" description = "Descarga el archivo original o reportes." >
        <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => console.log("Download original", basic.id)} label="Original" secondary />
            <ActionButton onClick={() => console.log("Download JSON Report", basic.id)} label="JSON Report" secondary />
        </div>
                </ModuleCard >

            </div >
        </div >
    );
}

function ModuleCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm transition-shadow hover:shadow-md">
            <h5 className="font-bold text-slate-800 dark:text-slate-200">{title}</h5>
            <p className="text-xs text-slate-500 mb-3">{description}</p>
            {children}
        </div>
    );
}

function ActionButton({ label, onClick, secondary, loading }: { label: string; onClick: () => void; secondary?: boolean; loading?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`
                px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1
                ${secondary
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50'}
                ${loading ? 'opacity-70 cursor-not-allowed' : ''}
            `}
        >
            {loading && <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />}
            {label}
        </button>
    );
}

function Row({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex justify-between">
            <span className="text-slate-500">{label}:</span>
            <span className="text-slate-900 dark:text-slate-100 text-right truncate max-w-[60%]">
                {value || "—"}
            </span>
        </div>
    );
}
