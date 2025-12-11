import { useMemo } from 'react';
import { useDocumentsStore } from '../../store/useDocumentsStore';
import type { DocumentAnalysis } from '../../types/documents';

interface InsightsPanelProps {
    documents: DocumentAnalysis[];
}

export function InsightsPanel({ }: InsightsPanelProps) {
    const { summary } = useDocumentsStore();

    const stats = useMemo(() => {
        const total = summary.totalDocs;

        const kinds = summary.distributionByType.map(item => ({
            ...item,
            pct: total > 0 ? (item.count / total) * 100 : 0
        }));

        const extensions = summary.topExtensions.map(item => ({
            label: item.ext, // Map 'ext' to 'label'
            count: item.count,
            pct: total > 0 ? (item.count / total) * 100 : 0
        }));

        return { kinds, extensions, total };
    }, [summary]);

    if (stats.total === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            {/* Column 1: Document Types */}
            <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-4">
                    Distribución por Tipo
                </h4>
                <div className="space-y-3">
                    {stats.kinds.map((item) => (
                        <div key={item.label} className="flex items-center gap-3 text-sm">
                            <span className="w-24 text-slate-600 dark:text-slate-300 capitalize truncate" title={item.label}>
                                {item.label.replace(/_/g, ' ')}
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-blue-500 dark:bg-blue-600 transition-all duration-500"
                                    style={{ width: `${item.pct}%` }}
                                />
                            </div>
                            <span className="w-8 text-right font-mono text-slate-500 text-xs">
                                {item.count}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Column 2: Top Extensions */}
            <div>
                <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-4">
                    Top Extensiones
                </h4>
                <div className="space-y-3">
                    {stats.extensions.map((item) => (
                        <div key={item.label} className="flex items-center gap-3 text-sm">
                            <span className="w-16 text-slate-600 dark:text-slate-300 font-mono text-xs">
                                {item.label}
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-emerald-500 dark:bg-emerald-600 transition-all duration-500"
                                    style={{ width: `${item.pct}%` }}
                                />
                            </div>
                            <span className="w-8 text-right font-mono text-slate-500 text-xs">
                                {item.count}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
