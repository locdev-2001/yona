import { useId, useState, useRef, useLayoutEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dimensionTokens, spacingPixels } from './tokens';
import './chart-components.css';

export type DesignChartSeries = { key: string; label: string; values: number[]; color?: string; dashed?: boolean };
const seriesColors = ['chart-messages', 'chart-connections', 'chart-email', 'chart-volume', 'chart-peak'];
export const chartSeriesColor = (index: number) => `var(--preview-${seriesColors[index % seriesColors.length]})`;

export function DesignTimeSeries({title, dates, series, variant = 'line', summary, dateLabel, formatDate, formatValue}: {
    title: string; dates: string[]; series: DesignChartSeries[]; variant?: 'line' | 'bar'; summary: string; dateLabel: string;
    formatDate: (date: string) => string; formatValue: (value: number) => string;
}) {
    const [hidden, setHidden] = useState<string[]>([]);
    const summaryId = useId();
    const chartRows = dates.map((date, offset) => ({date, ...Object.fromEntries(series.map(item => [item.key, item.values[offset] ?? 0]))}));
    const axes = <>
        <CartesianGrid vertical={false} stroke="var(--preview-border-divider)" strokeDasharray="2 5" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:'var(--preview-text-secondary)',fontSize:'var(--preview-text-chart-axis)'}} tickMargin={spacingPixels('control-padding')} tickFormatter={formatDate} />
        <YAxis axisLine={false} tickLine={false} width={Number.parseFloat(dimensionTokens['chart-axis-width'])} tick={{fill:'var(--preview-text-secondary)',fontSize:'var(--preview-text-chart-axis)'}} tickFormatter={formatValue} />
        <Tooltip cursor={variant === 'line' ? {stroke:'var(--preview-text-secondary)',strokeDasharray:'3 4'} : {fill:'var(--preview-surface-control)'}} content={({active,payload,label}) => active && payload?.length ? <div className="chart-tooltip"><strong>{formatDate(String(label))}</strong>{payload.map(entry => <p key={String(entry.dataKey)}><span style={{color:entry.color}}>{entry.name}</span><strong>{formatValue(Number(entry.value))}</strong></p>)}</div> : null} />
    </>;
    return <div className="design-time-series" role="group" aria-label={title} aria-describedby={summaryId}>
        <p id={summaryId} className="sr-only">{summary}</p>
        <div className="chart-series" role="group" aria-label={title}>{series.map((item,index) => <button key={item.key} type="button" aria-pressed={!hidden.includes(item.key)} onClick={() => setHidden(current => current.includes(item.key) ? current.filter(key => key !== item.key) : [...current,item.key])}><i style={{color:item.color ?? chartSeriesColor(index)}} />{item.label}</button>)}</div>
        <div className="traffic-chart"><ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {variant === 'line' ? <LineChart data={chartRows} margin={{top:spacingPixels('control-gap'),right:0,bottom:spacingPixels('control-gap'),left:0}} accessibilityLayer>{axes}{series.map((item,index) => <Line key={item.key} name={item.label} type="monotone" dataKey={item.key} stroke={item.color ?? chartSeriesColor(index)} strokeWidth={2.5} dot={false} activeDot={{r:4,strokeWidth:3,stroke:'var(--preview-surface-panel)'}} hide={hidden.includes(item.key)} isAnimationActive={false} />)}</LineChart> : <BarChart data={chartRows} margin={{top:spacingPixels('control-gap'),right:0,bottom:spacingPixels('control-gap'),left:0}} accessibilityLayer>{axes}{series.map((item,index) => <Bar key={item.key} name={item.label} dataKey={item.key} fill={item.color ?? chartSeriesColor(index)} radius={[Number.parseFloat(dimensionTokens['chart-bar-radius']),Number.parseFloat(dimensionTokens['chart-bar-radius']),0,0]} hide={hidden.includes(item.key)} isAnimationActive={false} />)}</BarChart>}
        </ResponsiveContainer></div>
        <table className="sr-only"><caption>{title}</caption><thead><tr><th>{dateLabel}</th>{series.map(item=><th key={item.key}>{item.label}</th>)}</tr></thead><tbody>{dates.map((date,offset)=><tr key={date}><th>{formatDate(date)}</th>{series.map(item=><td key={item.key}>{formatValue(item.values[offset] ?? 0)}</td>)}</tr>)}</tbody></table>
    </div>;
}

function FloatingDonutTooltip({ label, value, anchor }: { label: string; value: string; anchor: DOMRect | null }) {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    useLayoutEffect(() => {
        const bounds = tooltipRef.current?.getBoundingClientRect();
        if (bounds) setSize({ width: bounds.width, height: bounds.height });
    }, [label, value]);
    if (!anchor) return null;
    const gap = spacingPixels('control-gap');
    const inset = spacingPixels('page-padding-mobile');
    const rightFits = anchor.right + gap + size.width <= window.innerWidth - inset;
    const leftFits = anchor.left - gap - size.width >= inset;
    const above = window.innerWidth <= 760 || (!rightFits && !leftFits);
    const left = above
        ? Math.max(inset, Math.min(anchor.left + (anchor.width - size.width) / 2, window.innerWidth - size.width - inset))
        : rightFits ? anchor.right + gap : anchor.left - gap - size.width;
    const top = above ? anchor.top - gap - size.height : anchor.top + (anchor.height - size.height) / 2;
    return createPortal(<div ref={tooltipRef} className="chart-tooltip design-donut-tooltip" style={{ left, top: Math.max(gap, top) }}><strong>{label}</strong><span>{value}</span></div>, document.body);
}

export function DesignDonut({title,slices,centerValue,centerLabel,legend,formatValue = String}: {
    title:string; slices:{key:string;label:string;value:number;color?:string}[]; centerValue:string; centerLabel:string; legend?:ReactNode; formatValue?:(value:number)=>string;
}) {
    const donutRef = useRef<HTMLDivElement>(null);
    const total=slices.reduce((sum,slice)=>sum+slice.value,0);
    return <div className="distribution" role="group" aria-label={title}>
        <div className="donut" ref={donutRef}><ResponsiveContainer width="100%" height="100%" minWidth={0}><PieChart><Pie data={slices} dataKey="value" nameKey="label" innerRadius="76%" outerRadius="97%" paddingAngle={4} stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>{slices.map((slice,index)=><Cell key={slice.key} fill={slice.color ?? chartSeriesColor(index)} />)}</Pie><Tooltip content={({active,payload})=>active&&payload?.length?<FloatingDonutTooltip label={String(payload[0].name)} value={formatValue(Number(payload[0].value))} anchor={donutRef.current?.getBoundingClientRect() ?? null} />:null} /></PieChart></ResponsiveContainer><div className="donut-label" data-compact={centerValue.length > 5}><strong>{centerValue}</strong><span>{centerLabel}</span></div></div>
        {legend ?? <div className="distribution-legend">{slices.map((slice,index)=><div key={slice.key}><span><i style={{color:slice.color ?? chartSeriesColor(index)}} />{slice.label}</span><strong>{formatValue(slice.value)} · {formatValue(total ? slice.value/total*100 : 0)}%</strong></div>)}</div>}
    </div>;
}
