import { router, usePage } from '@inertiajs/react';

import Button from 'dashboard/components-next/button/Button';
import type { SharedPageProps } from '../types';

// Placeholder dashboard — shell + sidebar thật vào ở A3.
export default function DashboardIndex() {
    const { auth } = usePage<SharedPageProps>().props;

    return (
        <main className="flex flex-col items-center justify-center w-full min-h-screen gap-4 bg-n-background">
            <h1 className="text-xl font-medium text-n-slate-12">{auth.user?.name}</h1>
            <p className="text-sm text-n-slate-11">{auth.user?.email}</p>
            <Button
                slate
                sm
                label="Logout"
                onClick={() => router.post('/app/logout')}
            />
        </main>
    );
}
