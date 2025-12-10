import { type ReactNode } from 'react';

interface LayoutShellProps {
    children: ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100">
            <div className="max-w-7xl mx-auto px-4 pb-12">
                {children}
            </div>
        </div>
    );
}
