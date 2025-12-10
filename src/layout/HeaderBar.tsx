

interface HeaderBarProps {
    isDark: boolean;
    toggleTheme: () => void;
}

export function HeaderBar({ isDark, toggleTheme }: HeaderBarProps) {
    return (
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-200 mb-6">
            <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    EVORIX <span className="text-slate-400 dark:text-slate-600">|</span> <span className="font-light text-slate-600 dark:text-slate-300">Smart Document Analyzer</span>
                </h1>
                <span className="text-xs text-slate-500 dark:text-slate-500 hidden sm:block">
                    Analiza documentos, extrae insights, sin ruido visual.
                </span>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                    ~ Módulos activos: 3
                </div>

                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                    aria-label="Toggle Dark Mode"
                >
                    {isDark ? (
                        // Sun icon
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ) : (
                        // Moon icon
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    )}
                </button>
            </div>
        </header>
    );
}
