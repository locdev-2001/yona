import { Head } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import BarChart from 'shared/components/charts/BarChart';

type Stats = {
    chartData: [string, number][];
    accountsCount: string;
    usersCount: string;
    inboxesCount: string;
    conversationsCount: string;
};

const CHART_ARIA_LABEL = 'Conversations created by day';

// Port từ app/javascript/superadmin_pages/views/dashboard/Index.vue — số liệu
// nạp bằng một lần gọi JSON vào chính đường dẫn trang, biểu đồ dùng chung
// BarChart của dashboard.
export default function SuperAdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        fetch(window.location.pathname, { headers: { Accept: 'application/json' } })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return response.json();
            })
            .then(setStats)
            .catch(() => setFailed(true));
    }, []);

    const loading = !stats && !failed;
    const metrics = [
        { label: 'Accounts', value: stats?.accountsCount },
        { label: 'Users', value: stats?.usersCount },
        { label: 'Inboxes', value: stats?.inboxesCount },
        { label: 'Conversations', value: stats?.conversationsCount },
    ];

    const chartData = useMemo(
        () => ({
            categories: (stats?.chartData ?? []).map(([day]) => format(parseISO(day), 'dd-MMM')),
            series: [
                {
                    id: 'conversations',
                    label: 'Conversations',
                    color: '#1f93ff',
                    data: (stats?.chartData ?? []).map(([, value]) => value),
                },
            ],
        }),
        [stats],
    );

    return (
        <div className="w-full h-full">
            <Head title="Admin Dashboard" />
            <header className="main-content__header" role="banner">
                <h1 id="page-title" className="main-content__page-title">
                    Admin Dashboard
                </h1>
            </header>

            <section className="main-content__body main-content__body--flush">
                <div className="report--list">
                    {metrics.map(metric => (
                        <div className="report-card" key={metric.label}>
                            <div className="metric">
                                {loading ? (
                                    <span className="inline-block w-20 h-8 rounded bg-woot-100 animate-pulse" />
                                ) : (
                                    metric.value || 'N/A'
                                )}
                            </div>
                            <div>{metric.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {loading ? (
                <div className="p-8 mx-8 h-64 rounded bg-woot-100 animate-pulse" />
            ) : failed ? null : (
                <div className="p-8 w-full min-w-0">
                    <BarChart data={chartData} height={500} timeseries ariaLabel={CHART_ARIA_LABEL} />
                </div>
            )}
        </div>
    );
}
