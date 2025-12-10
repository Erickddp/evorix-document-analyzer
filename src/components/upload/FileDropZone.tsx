import { useState } from 'react';
import { useDocumentsStore } from '../../store/useDocumentsStore';

export function FileDropZone() {
    const { ingestFiles } = useDocumentsStore();
    const [isDragging, setIsDragging] = useState(false);

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
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            void ingestFiles(e.dataTransfer.files);
        }
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
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                void ingestFiles(e.target.files);
                            }
                        }}
                    />
                </label>
            </div>
        </div>
    );
}
