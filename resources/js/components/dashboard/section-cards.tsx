import { StatCard } from '@/components/ui/stat-card';
import { useTranslator } from '@/lib/i18n';
import { CircleDollarSign, Target, TrendingUp, Users } from 'lucide-react';

// Mock KPI series — wire to real metrics later.
const cards = [
    { key: 'revenue', icon: CircleDollarSign, value: '₫1.250.000', delta: 12.5, series: [12, 18, 14, 22, 19, 26, 24, 30] },
    { key: 'leads', icon: Users, value: '1.234', delta: -20, series: [40, 36, 38, 30, 28, 24, 22, 18] },
    { key: 'deals', icon: Target, value: '486', delta: 12.5, series: [20, 24, 22, 28, 30, 34, 33, 38] },
    { key: 'win_rate', icon: TrendingUp, value: '24,5%', delta: 4.5, series: [14, 15, 16, 16, 18, 19, 21, 23] },
];

export function SectionCards() {
    const t = useTranslator();

    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <StatCard
                    key={card.key}
                    label={t(`platform.dashboard.kpi.${card.key}`)}
                    value={card.value}
                    icon={card.icon}
                    delta={card.delta}
                    series={card.series}
                />
            ))}
        </div>
    );
}
