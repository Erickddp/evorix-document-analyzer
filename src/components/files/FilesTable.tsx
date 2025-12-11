import { type DocumentAnalysis, type DocumentKind } from '../../types/documents';
import { Tag } from '../common/Tag';

interface FilesTableProps {
    documents: DocumentAnalysis[];
    onSelect: (id: string) => void;
    selectedId: string | null;
}

export function FilesTable({ documents, onSelect, selectedId }: FilesTableProps) {
    if (documents.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 min-h-[300px] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-500">No hay documentos que mostrar.</p>
                </div>
            </div>
        );
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const kindColors: Record<DocumentKind, 'blue' | 'green' | 'gray' | 'yellow' | 'red'> = {
        invoice: 'blue',
        contract: 'green',
        receipt: 'yellow',
        report: 'gray',
        unknown: 'red',
        payroll: 'blue',
        letter: 'gray',
        bank_statement: 'gray',
        id: 'blue',
        policy: 'green',
        other: 'gray'
    };

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm h-full flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-1">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 relative">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tamaño</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Metadatos</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Confianza</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-950 divide-y divide-slate-200 dark:divide-slate-800">
                        {documents.map((doc) => {
                            const hasMeta = Object.keys(doc.metadata).length > 0;
                            const isSelected = doc.basic.id === selectedId;
                            const phase = doc.basic.scan.phase;

                            let statusColor: 'gray' | 'blue' | 'green' | 'red' | 'yellow' = 'gray';
                            let statusText = 'Pendiente';

                            if (phase === 'queued') {
                                statusColor = 'gray';
                                statusText = 'En cola';
                            } else if (phase === 'quick-scanning') {
                                statusColor = 'blue';
                                statusText = 'Escaneando...';
                            } else if (phase === 'deep-scannable' || phase === 'completed') {
                                statusColor = 'green';
                                statusText = 'Analizado';
                            } else if (phase === 'error') {
                                statusColor = 'red';
                                statusText = 'Error';
                            }

                            // Confidence format
                            const confidencePct = doc.classificationConfidence > 0
                                ? `${(doc.classificationConfidence * 100).toFixed(0)}%`
                                : '-';

                            return (
                                <tr
                                    key={doc.basic.id}
                                    onClick={() => onSelect(doc.basic.id)}
                                    className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate" title={doc.basic.fileName}>
                                            {doc.basic.fileName}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Tag color={statusColor}>{statusText}</Tag>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Tag color={kindColors[doc.basic.kind] || 'gray'}>
                                            {doc.basic.kind}
                                        </Tag>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        {formatSize(doc.basic.sizeBytes)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        {hasMeta ? "Sí" : "No"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                        {confidencePct}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

