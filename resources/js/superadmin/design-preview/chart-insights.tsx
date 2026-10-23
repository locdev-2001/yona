import type { ReactNode } from 'react';
import { CalendarDays, Repeat } from '@admin/components/icons';
import './chart-insights.css';

type ChartInsight = { id: string; label: string; value: string; detail: string; icon: ReactNode };

export function ChartInsights({ items }: { items: ChartInsight[] }) {
    return <dl className="chart-insights">{items.map(item => <div key={item.id} className="chart-insight"><dt><span className="chart-insight-icon" aria-hidden="true">{item.icon}</span>{item.label}</dt><dd><strong className="chart-insight-value">{item.value}</strong><span className="chart-insight-detail">{item.detail}</span></dd></div>)}</dl>;
}

export function ChartInsightsDemo() {
    return <>
        <p className="catalogue-hint">Mẫu đã duyệt · dùng token V1. Số liệu minh hoạ.</p>
        <ChartInsights items={[
            {id:'reply-ratio', label:'Tỉ lệ tin ra / tin vào', value:'72,5%', detail:'Trong khoảng thời gian đã chọn', icon:<Repeat />},
            {id:'peak', label:'Ngày có nhiều tin vào nhất', value:'303 tin', detail:'Ngày 25/09', icon:<CalendarDays />},
        ]} />
    </>;
}
