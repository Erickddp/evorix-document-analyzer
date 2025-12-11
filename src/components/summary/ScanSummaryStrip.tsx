import type { DocumentAnalysis, ScanJobMetrics } from "../../types/documents";

interface ScanSummaryStripProps {
    documents: DocumentAnalysis[];
    scanJob: ScanJobMetrics;
}

export function ScanSummaryStrip({ documents, scanJob }: ScanSummaryStripProps) {

    const totalDocs = documents.length;

    // Calculate metrics
    // Tipos únicos
    const tiposDetectados = new Set(documents.map(d => d.basic.kind)).size;

    // Total size MB
    const totalSizeMb = (documents.reduce((acc, d) => acc + d.basic.sizeBytes, 0) / (1024 * 1024));

    // Docs w/ metadata
    // Metadatos válidos si tiene al menos author o software o device, etc.
    const docsWithMeta = documents.filter(d =>
        (d.metadata.author || d.metadata.software || d.metadata.device || d.metadata.exifCamera)
    ).length;

    const metaPct = totalDocs > 0 ? (docsWithMeta / totalDocs) * 100 : 0;

    const isScanning = scanJob.isScanning;
    const progressPct = scanJob.totalFiles > 0
        ? (scanJob.processedFiles / scanJob.totalFiles) * 100
        : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">

            {/* Si está escaneando, mostramos barra de progreso overlay o integrada */}
            {isScanning && (
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-100 dark:bg-blue-900/30">
                    <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            )}

            <MetricCard
                label="TOTAL DOCUMENTOS"
                value={totalDocs}
                subtext={isScanning ? `${scanJob.processedFiles} procesados` : "Archivos cargados"}
            />
            <MetricCard
                label="TIPOS DETECTADOS"
                value={tiposDetectados}
                subtext="Formatos únicos"
            />
            <MetricCard
                label="DOCS CON METADATOS"
                value={`${metaPct.toFixed(1)}%`}
                subtext={`${docsWithMeta} de ${totalDocs} archivos`}
            />
            <MetricCard
                label="TAMAÑO TOTAL"
                value={`${totalSizeMb.toFixed(1)} MB`}
                subtext="Volumen de datos"
            />
        </div>
    );
}

interface MetricCardProps {
    label: string;
    value: string | number;
    subtext: string;
}

function MetricCard({ label, value, subtext }: MetricCardProps) {
    return (
        <div className="rounded-xl bg-white/50 dark:bg-slate-900/50 p-3 flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">{label}</span>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
            <p className="text-xs text-slate-500 mt-1 truncate">{subtext}</p>
        </div>
    );
}
