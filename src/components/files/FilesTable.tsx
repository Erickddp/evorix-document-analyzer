import React, { useState, useEffect } from 'react';
import { type DocumentAnalysis, type DocumentKind, DOCUMENT_KIND_LABEL_ES } from '../../types/documents';
import { Tag } from '../common/Tag';

interface FilesTableProps {
    documents: DocumentAnalysis[];
    onSelect: (id: string) => void;
    selectedId: string | null;
}

export function FilesTable({ documents, onSelect, selectedId }: FilesTableProps) {
    // Pagination state
    const pageSize = 10;
    const [currentPage, setCurrentPage] = useState(1);

    const totalDocs = documents.length;
    const totalPages = Math.max(1, Math.ceil(totalDocs / pageSize));

    // Reset page if out of bounds (e.g. on filter change)
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageDocuments = documents.slice(startIndex, endIndex);

    if (documents.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 min-h-[300px] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-500">No hay documentos que mostrar.</p>
                </div>
            </div>
        );
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const kindColors: Record<DocumentKind, 'blue' | 'green' | 'gray' | 'yellow' | 'red'> = {
        factura: 'blue',
        ticket_recibo: 'yellow',
        nomina: 'blue',
        contrato: 'green',
        reporte: 'gray',
        documento_general: 'gray',
        imagen: 'gray',
        datos_tabulares: 'green',
        presentacion: 'yellow',
        desconocido: 'red',
    };

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm h-full flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-1">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 relative">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tamaño</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Metadatos</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Confianza</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-950 divide-y divide-slate-200 dark:divide-slate-800">
                        {pageDocuments.map((doc) => {
                            const hasMeta = Object.keys(doc.metadata).length > 0;
                            const isSelected = doc.basic.id === selectedId;
                            const phase = doc.basic.scan.phase;

                            let statusColor: 'gray' | 'blue' | 'green' | 'red' | 'yellow' = 'gray';
                            let statusText = 'Pendiente';

                            if (phase === 'queued') {
                                statusColor = 'gray';
                                statusText = 'En cola';
                            } else if (phase === 'quick-scanning') {
                                statusColor = 'blue';
                                statusText = 'Escaneando...';
                            } else if (phase === 'deep-scannable' || phase === 'completed') {
                                statusColor = 'green';
                                statusText = 'Analizado';
                            } else if (phase === 'error') {
                                statusColor = 'red';
                                statusText = 'Error';
                            }

                            // Confidence format
                            const confidencePct = doc.classificationConfidence > 0
                                ? `${(doc.classificationConfidence * 100).toFixed(0)}%`
                                : '-';

                            return (
                                <tr
                                    key={doc.basic.id}
                                    onClick={() => onSelect(doc.basic.id)}
                                    className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate" title={doc.basic.fileName}>
                                            {doc.basic.fileName}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Tag color={statusColor}>{statusText}</Tag>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Tag color={kindColors[doc.basic.kind] || 'gray'}>
                                            {DOCUMENT_KIND_LABEL_ES[doc.basic.kind] ?? doc.basic.kind}
                                        </Tag>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        {formatSize(doc.basic.sizeBytes)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        {hasMeta ? "Sí" : "No"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        {confidencePct}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {totalDocs > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950">
                    <span>
                        Mostrando{" "}
                        <span className="font-semibold">
                            {startIndex + 1}–{Math.min(endIndex, totalDocs)}
                        </span>{" "}
                        de <span className="font-semibold">{totalDocs}</span> documentos
                    </span>

                    <div className="inline-flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Anterior
                        </button>

                        {/* Botones numéricos: solo unas pocas páginas alrededor de la actual */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((page) => {
                                if (totalPages <= 5) return true;
                                if (page === 1 || page === totalPages) return true;
                                return Math.abs(page - currentPage) <= 1;
                            })
                            .map((page, idx, arr) => {
                                // Agregar "..." cuando se omiten páginas en medio
                                const prev = arr[idx - 1];
                                const showEllipsis = prev && page - prev > 1;

                                return (
                                    <React.Fragment key={page}>
                                        {showEllipsis && (
                                            <span className="px-1 select-none">…</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-2 py-1 rounded-md text-sm border transition-colors ${page === currentPage
                                                ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                                                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    </React.Fragment>
                                );
                            })}

                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

