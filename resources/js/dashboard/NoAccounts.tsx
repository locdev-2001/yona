import { router } from '@inertiajs/react';

import Button from 'dashboard/components-next/button/Button';

// Placeholder cho màn /app/no-accounts của Chatwoot — UI đầy đủ vào ở A3.
export default function NoAccounts() {
    return (
        <main className="flex flex-col items-center justify-center w-full min-h-screen gap-4 bg-n-background">
            <h1 className="text-xl font-medium text-n-slate-12">No accounts found</h1>
            <Button slate sm label="Logout" onClick={() => router.post('/app/logout')} />
        </main>
    );
}
