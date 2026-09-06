import VizBarChart, { type VizBarChartProps } from './viz/BarChart';
import type { CartesianItemPayload } from './viz/cartesianLayout';

// Port từ shared/components/charts/BarChart.vue — bọc BarChart của @chatwoot/viz
// và bơm bảng biến CSS theo bảng màu Chatwoot (đúng chuỗi class của bản gốc).

const VIZ_THEME_CLASS =
    '[--cw-viz-bar-label-color:rgb(var(--slate-11))] [--cw-viz-bar-axis-color:rgb(var(--slate-6))] [--cw-viz-bar-zero-line-color:rgb(var(--slate-8))] [--cw-viz-bar-value-color:rgb(var(--slate-11))] [--cw-viz-bar-tooltip-border-color:rgb(var(--border-strong))] [--cw-viz-bar-tooltip-color:rgb(var(--slate-12))] [--cw-viz-bar-tooltip-background:rgb(var(--solid-2))] [--cw-viz-bar-tooltip-label-color:rgb(var(--slate-11))] [--cw-viz-bar-tooltip-active-color:rgb(var(--slate-12))]';

export interface BarChartProps extends Omit<VizBarChartProps, 'onItemClick' | 'ariaLabel'> {
    ariaLabel: string;
    clickable?: boolean;
    onItemClick?: (payload: CartesianItemPayload) => void;
}

export default function BarChart({ clickable = false, onItemClick, className = '', ...rest }: BarChartProps) {
    return (
        <VizBarChart
            {...rest}
            onItemClick={clickable ? onItemClick : undefined}
            className={`${VIZ_THEME_CLASS} ${className}`.trim()}
        />
    );
}
