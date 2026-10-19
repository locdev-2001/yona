// Port từ reports/components/CsatEmptyState.vue
interface CsatEmptyStateProps {
    title: string;
    description?: string;
    icon?: string;
}

export default function CsatEmptyState({
    title,
    description = '',
    icon = 'i-lucide-message-square-off',
}: CsatEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="size-16 rounded-full bg-n-alpha-2 flex items-center justify-center mb-4">
                <i className={`${icon} size-8 text-n-slate-10`} />
            </div>
            <h3 className="text-base font-medium text-n-slate-12 mb-1">{title}</h3>
            {description && <p className="text-sm text-n-slate-10 max-w-sm">{description}</p>}
        </div>
    );
}
