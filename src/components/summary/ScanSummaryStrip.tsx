import { useDocumentsStore } from '../../store/useDocumentsStore';
import { type DocumentAnalysis } from '../../types/documents';

interface ScanSummaryStripProps {
    documents: DocumentAnalysis[];
}

export function ScanSummaryStrip({ documents }: ScanSummaryStripProps) {
    const { scanJob } = useDocumentsStore();

    const totalDocs = documents.length;
    const uniqueTypes = new Set(documents.map(d => d.basic.kind)).size;
    const withMetadata = documents.filter(d => Object.keys(d.metadata).length > 0).length;
    const pctMetadata = totalDocs > 0 ? Math.round((withMetadata / totalDocs) * 100) : 0;

    const totalSize = documents.reduce((acc, d) => acc + d.basic.sizeBytes, 0);
    const sizeMb = (totalSize / (1024 * 1024)).toFixed(1);

    // Scan progress calculation
    const isScanning = scanJob.isScanning;
    const progressPct = scanJob.totalFiles > 0
        ? Math.round((scanJob.processedFiles / scanJob.totalFiles) * 100)
        : 100;

    const estimatedSec = scanJob.estimatedMsRemaining
        ? Math.ceil(scanJob.estimatedMsRemaining / 1000)
        : 0;

    return (
        <div className="flex flex-col gap-3">
            {/* Main Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card label="Total Documentos" value={String(totalDocs)} />
                <Card label="Tipos Detectados" value={String(uniqueTypes)} />
                <Card label="Docs con Metadatos" value={`${pctMetadata}%`} />
                <Card label="Tamaño Total" value={`${sizeMb} MB`} />
            </div>

            {/* Scan Progress Strip */}
            {isScanning ? (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 p-3 flex items-center justify-between text-sm animate-pulse">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 text-blue-500 animate-spin border-2 border-blue-500 border-t-transparent rounded-full font-bold"></div>
                        <span className="font-medium text-blue-700 dark:text-blue-300">
                            Escaneando {scanJob.processedFiles} / {scanJob.totalFiles} documentos...
                        </span>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 font-mono">
                        ~{estimatedSec} s restantes
                    </span>
                </div>
            ) : (
                scanJob.totalFiles > 0 && scanJob.processedFiles === scanJob.totalFiles && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900 p-2 px-3 flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-emerald-700 dark:text-emerald-300">
                            Escaneo rápido completado. Listo para análisis detallado.
                        </span>
                    </div>
                )
            )}
        </div>
    );
}

function Card({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 flex flex-col">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1">
                {label}
            </span>
            <span className="text-2xl font-light text-slate-900 dark:text-slate-100">
                {value}
            </span>
        </div>
    );
}
