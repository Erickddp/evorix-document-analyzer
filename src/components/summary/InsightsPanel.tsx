import { useMemo } from 'react';
import type { DocumentAnalysis } from '../../types/documents';

interface InsightsPanelProps {
    documents: DocumentAnalysis[];
}

export function InsightsPanel({ documents }: InsightsPanelProps) {

    // Calculate stats from 'documents' prop
    const stats = useMemo(() => {
        // Stats by type
        const byType: Record<string, number> = {};
        // Stats by Extension
        const byExt: Record<string, number> = {};

        documents.forEach(doc => {
            // Type
            const k = doc.basic.kind || 'unknown';
            byType[k] = (byType[k] || 0) + 1;

            // Extension
            const e = doc.basic.extension || 'other';
            byExt[e] = (byExt[e] || 0) + 1;
        });

        // Sort Top Extensions
        const topExt = Object.entries(byExt)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([ext, count]) => ({ ext, count }));

        // Sort Types (optional, just for cleaner listing)
        const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);

        return { typeEntries, topExt };
    }, [documents]);

    if (documents.length === 0) return null; // Hide if empty

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Distribución por Tipo */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wide">
                    Distribución por Tipo
                </h4>
                <div className="space-y-3">
                    {stats.typeEntries.map(([kind, count]) => (
                        <div key={kind}>
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span className="capitalize">{kind}</span>
                                <span>{count}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{ width: `${(count / documents.length) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chart 2: Top Extensiones */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wide">
                    Top Extensiones
                </h4>
                <div className="flex items-end gap-4 h-32 pt-2">
                    {stats.topExt.map((item) => {
                        const max = stats.topExt[0]?.count || 1;
                        const heightPct = (item.count / max) * 100;
                        return (
                            <div key={item.ext} className="flex-1 flex flex-col items-center group">
                                <div className="w-full flex-1 flex items-end justify-center relative">
                                    {/* Tooltip on hover */}
                                    <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {item.count} docs
                                    </div>
                                    <div
                                        className="w-full bg-emerald-500/80 hover:bg-emerald-500 transition-all rounded-t-md"
                                        style={{ height: `${heightPct}%`, minHeight: '4px' }}
                                    />
                                </div>
                                <span className="mt-2 text-[10px] uppercase font-bold text-slate-500">{item.ext}</span>
                            </div>
                        );
                    })}
                    {stats.topExt.length === 0 && (
                        <p className="w-full text-center text-xs text-slate-400">Sin datos</p>
                    )}
                </div>
            </div>
        </div>
    );
}
