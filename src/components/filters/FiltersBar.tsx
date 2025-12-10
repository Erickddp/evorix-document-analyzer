import { type DocumentsFilters, type DocumentKind } from '../../types/documents';

interface FiltersBarProps {
    filters: DocumentsFilters;
    onChange: (partial: Partial<DocumentsFilters>) => void;
}

export function FiltersBar({ filters, onChange }: FiltersBarProps) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg rounded-md leading-5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Buscar por nombre, tipo o dato clave..."
                        value={filters.search}
                        onChange={(e) => onChange({ search: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Kind Select */}
                    <select
                        className="block w-full pl-3 pr-8 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                        value={filters.kind}
                        onChange={(e) => onChange({ kind: e.target.value as DocumentKind | "all" })}
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="invoice">Factura (Invoice)</option>
                        <option value="contract">Contrato</option>
                        <option value="receipt">Recibo</option>
                        <option value="report">Reporte</option>
                        <option value="payroll">Nómina</option>
                        <option value="unknown">Desconocido</option>
                        {/* Add others as needed */}
                    </select>

                    {/* Metadata Select */}
                    <select
                        className="block w-full pl-3 pr-8 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                        value={filters.hasMetadata}
                        onChange={(e) => onChange({ hasMetadata: e.target.value as any })}
                    >
                        <option value="all">Metadatos: Todos</option>
                        <option value="yes">Con Metadatos</option>
                        <option value="no">Sin Metadatos</option>
                    </select>

                    {/* Size Select */}
                    <select
                        className="block w-full pl-3 pr-8 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                        value={filters.sizeBucket}
                        onChange={(e) => onChange({ sizeBucket: e.target.value as any })}
                    >
                        <option value="all">Tamaño: Todos</option>
                        <option value="small">Pequeño (&lt;1MB)</option>
                        <option value="medium">Medio (1-10MB)</option>
                        <option value="large">Grande (&gt;10MB)</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
