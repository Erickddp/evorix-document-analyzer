

interface BadgeProps {
    label: string;
}

export function Badge({ label }: BadgeProps) {
    return (
        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:text-slate-200">
            {label}
        </span>
    );
}
