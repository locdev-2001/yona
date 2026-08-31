import { usePage } from '@inertiajs/react';

import Dashboard from './Dashboard';
import type { DashboardPageProps } from './types';

interface PlaceholderPageProps extends DashboardPageProps {
    view: string;
}

// Trang con chưa port — giữ đúng URL, nội dung dựng ở tính năng tương ứng (B→F).
export default function PlaceholderView() {
    const { view } = usePage<PlaceholderPageProps>().props;

    return (
        <Dashboard>
            <div className="flex flex-1 items-center justify-center p-8">
                <div className="custom-dashed-border rounded-2xl px-16 py-12 text-center">
                    <p className="text-base font-medium text-n-slate-12 mb-1">{view}</p>
                    <p className="text-sm text-n-slate-11 mb-0">Coming soon</p>
                </div>
            </div>
        </Dashboard>
    );
}
