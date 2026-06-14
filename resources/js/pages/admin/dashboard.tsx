import { Button } from '@/components/ui/button';
import type { SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

export default function AdminDashboard() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Admin Dashboard" />
            <div className="flex min-h-screen flex-col gap-4 p-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Admin</h1>
                    <Button asChild variant="outline" size="sm">
                        <Link href={route('admin.logout')} method="post" as="button">
                            Log out
                        </Link>
                    </Button>
                </div>
                {auth.admin && <p className="text-muted-foreground text-sm">Signed in as {auth.admin.email}</p>}
            </div>
        </>
    );
}
