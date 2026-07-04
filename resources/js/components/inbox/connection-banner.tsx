import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import type { ChannelAccountInfo } from './account-rail';

/** P07 — banner per-account (thay banner 1-kết-nối cũ): nhắc từng tài khoản cần quét lại QR. */
export function ConnectionBanner({ accounts }: { accounts: ChannelAccountInfo[] }) {
    const needsAttention = accounts.filter((acc) => acc.status === 'session_lost' || acc.status === 'needs_qr');

    if (needsAttention.length === 0) return null;

    return (
        <>
            {needsAttention.map((acc) => (
                <Alert key={acc.id} variant={acc.status === 'session_lost' ? 'destructive' : 'default'} className="rounded-none border-x-0 px-3 py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                        <span>
                            Tài khoản <strong>{acc.display_name ?? 'Zalo'}</strong>{' '}
                            {acc.status === 'session_lost' ? 'mất kết nối. Tin nhắn mới có thể chưa nhận được.' : 'chưa kết nối.'} Cần quét lại QR.
                        </span>
                        <Button size="sm" variant="outline" className="ml-3 h-7 shrink-0" onClick={() => router.visit(route('integrations.zalo.index'))}>
                            Quét QR
                        </Button>
                    </AlertDescription>
                </Alert>
            ))}
        </>
    );
}
