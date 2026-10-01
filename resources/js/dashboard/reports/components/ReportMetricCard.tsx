import { ICONS } from 'dashboard/icons';

// Port từ reports/components/ReportMetricCard.vue
interface ReportMetricCardProps {
    label: string;
    value: string;
    infoText: string;
    disabled?: boolean;
    className?: string;
}

export default function ReportMetricCard({ label, value, infoText, disabled = false, className = '' }: ReportMetricCardProps) {
    return (
        <div
            data-test-id="reportMetricContainer"
            className={[disabled ? 'grayscale pointer-events-none opacity-30' : '', className].filter(Boolean).join(' ') || undefined}
        >
            <h3 className="flex items-center m-0 text-sm font-medium text-n-slate-11">
                <span data-test-id="reportMetricLabel">{label}</span>
                <span title={infoText} data-test-id="reportMetricInfo" className="text-n-slate-11 my-0 mx-1 mt-0.5">
                    <span className={`${ICONS.info} size-3.5`} aria-hidden="true" />
                </span>
            </h3>
            <h4 data-test-id="reportMetricValue" className="mt-1 mb-0 text-2xl text-n-slate-12">
                {value}
            </h4>
        </div>
    );
}
