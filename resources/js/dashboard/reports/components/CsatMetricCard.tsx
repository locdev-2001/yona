// Port từ reports/components/CsatMetricCard.vue
interface CsatMetricCardProps {
    label: string;
    tooltip: string;
    value: string | number;
    isLoading?: boolean;
}

export default function CsatMetricCard({ label, tooltip, value, isLoading = false }: CsatMetricCardProps) {
    return (
        <div className="flex flex-col gap-2 items-start justify-center min-w-[10rem]">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-n-slate-11">
                {label}
                <span title={tooltip} className="i-lucide-info flex flex-shrink-0 text-n-slate-10 size-3.5" />
            </span>
            {isLoading ? (
                <div className="w-16 h-8 rounded-md bg-n-slate-3 animate-pulse" />
            ) : (
                <span className="text-2xl font-medium text-n-slate-12">{value}</span>
            )}
        </div>
    );
}
