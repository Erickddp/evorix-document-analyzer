

export function SidebarModules() {
    const modules = [
        { name: "Key Data Extractor", desc: "Extrae nombres, fechas y montos.", core: true },
        { name: "Metadata Inspector", desc: "Analiza autor, software y EXIF.", core: true },
        { name: "Document Classifier", desc: "Detecta facturas, contratos, etc.", core: true },
        // Future placeholders
        { name: "OCR Advanced", desc: "Procesamiento de texto en imagen.", core: false },
    ];

    return (
        <aside className="hidden lg:flex w-64 flex-col gap-3 shrink-0">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">
                Módulos Activos
            </h3>
            {modules.map((m) => (
                <div key={m.name} className={`
           p-3 rounded-xl border transition-all duration-200 cursor-default hover:shadow-md
           ${m.core
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/50 opacity-70'}
        `}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{m.name}</span>
                        {m.core && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
                                Core
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                        {m.desc}
                    </p>
                </div>
            ))}

            <div className="mt-auto p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-center">
                <p className="text-xs text-slate-400">
                    Más módulos en desarrollo...
                </p>
            </div>
        </aside>
    );
}
