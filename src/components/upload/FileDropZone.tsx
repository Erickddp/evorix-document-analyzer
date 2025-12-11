import { useState } from 'react';
import { useDocumentsStore } from '../../store/useDocumentsStore';
import type { DocumentAnalysis } from '../../types/documents';

export function FileDropZone() {
    const { ingestFiles, startProcessing, scanJob, items } = useDocumentsStore();
    const [isDragging, setIsDragging] = useState(false);

    const handleFiles = (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) {
            console.log('[Upload] handleFiles called with empty FileList');
            return;
        }
        const filesArray = Array.from(fileList);
        console.log('[Upload] handleFiles received', filesArray.length, 'files');
        ingestFiles(filesArray);
    };

    // Derive state from store
    // Derive state from store
    const queuedFiles = items.filter((doc: DocumentAnalysis) => doc.basic.scan.phase === 'queued');
    console.log('[Upload] queuedFiles current length =', queuedFiles.length);
    const isScanning = scanJob.isScanning;

    // Estimate time based on queued files
    const estimateScanTimeSeconds = (docs: DocumentAnalysis[]): number => {
        if (!docs.length) return 0;

        const totalBytes = docs.reduce((acc, d) => acc + d.basic.sizeBytes, 0);
        const totalMb = totalBytes / (1024 * 1024);

        const rough = docs.length * 0.7 + totalMb * 1.2;
        return Math.min(120, Math.max(5, Math.round(rough)));
    };

    const estimatedSeconds = queuedFiles.length > 0 ? estimateScanTimeSeconds(queuedFiles) : null;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        // Check if we are really leaving the zone (and not entering a child)
        // e.currentTarget.contains(e.relatedTarget) logic can be useful but for this simple UI, just false is okay
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
        relative overflow-hidden rounded-xl border-2 border-dashed
        transition-colors duration-200 flex flex-col items-center justify-center p-6 lg:p-10
        ${isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900'}
      `}
        >
            <div className="flex flex-col items-center text-center gap-2 z-10 w-full pointer-events-none">
                <div className="p-3 bg-white dark:bg-slate-950 shadow-sm rounded-full mb-2">
                    <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Soltar archivos aquí o seleccionar
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                    Soporta múltiples documentos y carpetas completas (PDF, Word, Excel, imágenes).
                </p>
                <span className="text-xs text-slate-400 mt-1">
                    El escaneo se realiza en segundo plano, pensado para lotes grandes.
                </span>

                <label className="mt-4 pointer-events-auto">
                    <span className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer inline-block">
                        Seleccionar archivos
                    </span>
                    <input
                        type="file"
                        multiple
                        // @ts-ignore
                        webkitdirectory="true"
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                    />
                </label>

                <button
                    type="button"
                    disabled={!queuedFiles.length || isScanning}
                    onClick={() => {
                        if (!queuedFiles.length || isScanning) return;
                        startProcessing();
                    }}
                    className={`mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold pointer-events-auto transition-all duration-200
    ${isScanning
                            ? "bg-slate-100 text-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-inner"
                            : "bg-transparent border border-slate-900/20 dark:border-slate-100/40 text-slate-900 dark:text-slate-100 hover:-translate-y-0.5 hover:bg-slate-900 hover:text-white dark:hover:bg-slate-100 dark:hover:text-slate-900 hover:shadow-lg"
                        }
    ${!queuedFiles.length ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
  `}
                >
                    {isScanning ? (
                        <>
                            <span className="inline-flex h-4 w-4 items-center justify-center">
                                <span className="h-4 w-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                            </span>
                            <span>Procesando archivos…</span>
                        </>
                    ) : (
                        <span>Escanear archivos</span>
                    )}
                </button>

                {
                    estimatedSeconds !== null && !isScanning && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 pointer-events-auto">
                            Tiempo estimado: ~{estimatedSeconds} s para una revisión básica de los documentos.
                        </p>
                    )
                }

                {
                    isScanning && (
                        <p className="mt-1 text-xs text-blue-500 pointer-events-auto animate-pulse">
                            Escaneando documentos... puedes seguir navegando.
                        </p>
                    )
                }

                {
                    !queuedFiles.length && !isScanning && items.length > 0 && (
                        <p className="mt-1 text-xs text-slate-400 pointer-events-auto">
                            No hay archivos pendientes.
                        </p>
                    )
                }
            </div >
        </div >
    );
}
