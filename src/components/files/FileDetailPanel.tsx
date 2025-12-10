import { type DocumentAnalysis } from '../../types/documents';
import { EmptyState } from '../common/EmptyState';
import { Tag } from '../common/Tag';

interface FileDetailPanelProps {
    document: DocumentAnalysis | null;
}

export function FileDetailPanel({ document }: FileDetailPanelProps) {
    if (!document) {
        return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 h-full min-h-[300px] flex items-center justify-center">
                <EmptyState
                    title="Sin selección"
                    subtitle="Selecciona un documento para ver detalles."
                    icon={
                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    }
                />
            </div>
        );
    }

    const { basic, metadata, keyData } = document;

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-full overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 truncate" title={basic.fileName}>
                    {basic.fileName}
                </h3>
                <p className="text-xs text-slate-500 mt-1">ID: {basic.id}</p>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-6">
                {/* Section 1: Summary */}
                <section>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">Resumen</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <span className="text-slate-500">Estado:</span>
                        <div className="text-right">
                            <span className={`
                    text-xs font-mono
                    ${basic.scan.phase === 'completed' || basic.scan.phase === 'deep-scannable' ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}
                `}>
                                {basic.scan.phase}
                            </span>
                        </div>

                        <span className="text-slate-500">Tipo Detectado:</span>
                        <div className="text-right"><Tag>{basic.kind}</Tag></div>

                        <span className="text-slate-500">Tamaño:</span>
                        <span className="text-slate-900 dark:text-slate-100 text-right">{(basic.sizeBytes / 1024).toFixed(1)} KB</span>

                        <span className="text-slate-500">OCR Elegible:</span>
                        <span className="text-slate-900 dark:text-slate-100 text-right">
                            {basic.ocrEligible ? 'Sí, disponible' : 'No'}
                        </span>

                        <span className="text-slate-500">Subido:</span>
                        <span className="text-slate-900 dark:text-slate-100 text-right whitespace-nowrap overflow-hidden text-ellipsis">
                            {new Date(basic.uploadedAt).toLocaleDateString()}
                        </span>
                    </div>
                    {basic.ocrEligible && (
                        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/10 rounded text-xs text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
                            ✨ Este documento es adecuado para extracción profunda (OCR).
                        </div>
                    )}
                </section>

                {/* Section 2: Metadata */}
                <section>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">Metadatos</h4>
                    {Object.keys(metadata).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No se detectaron metadatos.</p>
                    ) : (
                        <div className="space-y-2 text-sm">
                            {metadata.author && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Autor:</span>
                                    <span className="text-slate-900 dark:text-slate-100 text-right max-w-[60%] truncate">{metadata.author}</span>
                                </div>
                            )}
                            {metadata.software && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Software:</span>
                                    <span className="text-slate-900 dark:text-slate-100 text-right max-w-[60%] truncate">{metadata.software}</span>
                                </div>
                            )}
                            {metadata.pageCount && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Páginas:</span>
                                    <span className="text-slate-900 dark:text-slate-100 text-right">{metadata.pageCount}</span>
                                </div>
                            )}
                            {metadata.gpsCoordinates && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">GPS:</span>
                                    <span className="text-slate-900 dark:text-slate-100 text-right text-xs">
                                        {metadata.gpsCoordinates.lat.toFixed(4)}, {metadata.gpsCoordinates.lng.toFixed(4)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Section 3: Key Data */}
                <section>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3 text-blue-600 dark:text-blue-400">Datos Clave (Extracción)</h4>
                    {Object.keys(keyData).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No se extrajeron datos específicos.</p>
                    ) : (
                        <div className="space-y-3">
                            {keyData.amounts && keyData.amounts.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                                    <span className="text-xs text-slate-500 block mb-1">Montos</span>
                                    <div className="flex flex-wrap gap-1">
                                        {keyData.amounts.map((v, i) => (
                                            <span key={i} className="text-sm font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-1 rounded shadow-sm">
                                                ${v.toFixed(2)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {keyData.rfcs && keyData.rfcs.length > 0 && (
                                <div className="p-2">
                                    <span className="text-xs text-slate-500 block mb-1">RFCs</span>
                                    <div className="flex flex-wrap gap-1">
                                        {keyData.rfcs.map((v, i) => (
                                            <Tag key={i} color="blue">{v}</Tag>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {keyData.dates && keyData.dates.length > 0 && (
                                <div className="p-2">
                                    <span className="text-xs text-slate-500 block mb-1">Fechas</span>
                                    <div className="flex flex-wrap gap-1">
                                        {keyData.dates.map((v, i) => (
                                            <Tag key={i} color="gray">{v}</Tag>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
