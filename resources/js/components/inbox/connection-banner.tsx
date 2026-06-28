import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { router } from '@inertiajs/react';
import { AlertTriangle, Loader2, WifiOff } from 'lucide-react';
import { useState } from 'react';

export interface ConnectionInfo {
    id: number;
    display_name: string | null;
    state: string;
    session_lost_reason: string | null;
    last_connected_at: string | null;
    last_session_lost_at: string | null;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function getCsrfToken(): string {
    return decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '');
}

/** Tier 0: banner canh bao gian doan ket noi Zalo. Tra null khi khong can hien. */
export function ConnectionBanner({ connection }: { connection: ConnectionInfo | null }) {
    const [syncing, setSyncing] = useState(false);

    if (!connection) return null;

    const lostAt = connection.last_session_lost_at;
    const connAt = connection.last_connected_at;

    // Gap mo: lost > connected (hoac chua reconnect lan nao)
    const hasOpenGap = lostAt !== null && (connAt === null || lostAt > connAt);
    const isLost = connection.state === 'session_lost';

    if (!isLost && !hasOpenGap) return null;

    async function handleResync() {
        setSyncing(true);
        try {
            const res = await fetch(route('inbox.resync'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
            });
            const json = await res.json();
            if (res.ok) {
                alert(`Da dong bo ${json.fetched ?? 0} tin nhan nhom`);
                router.reload({ only: ['conversations'] });
            } else {
                alert('Dong bo that bai, vui long thu lai.');
            }
        } catch {
            alert('Khong the ket noi may chu, vui long thu lai.');
        } finally {
            setSyncing(false);
        }
    }

    if (isLost) {
        return (
            <Alert variant="destructive" className="rounded-none border-x-0 px-3 py-2">
                <WifiOff className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                    <span>Ket noi Zalo gian doan. Tin nhan moi co the chua nhan duoc.</span>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {/* ponytail: disabled khi session_lost vi bridge chua connected, /backfill/group se tra 409 */}
                            <Button size="sm" variant="outline" className="ml-3 h-7 shrink-0" disabled>
                                Dong bo lai
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ket noi lai Zalo truoc khi dong bo</TooltipContent>
                    </Tooltip>
                </AlertDescription>
            </Alert>
        );
    }

    // hasOpenGap && state !== session_lost: vua reconnect, gap con mo
    const timeLabel = lostAt ? ` luc ${formatTime(lostAt)}` : '';
    return (
        <Alert variant="default" className="rounded-none border-x-0 px-3 py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
                <span>
                    Ket noi Zalo bi gian doan{timeLabel}. Da dong bo lai cac tin nhan nhom gan nhat; tin cu hon hoac tin nhan 1-1 trong khoang nay co
                    the chua duoc khoi phuc. Vui long kiem tra Zalo neu can.
                </span>
                <Button
                    size="sm"
                    variant="outline"
                    className="ml-3 h-7 shrink-0"
                    disabled={syncing}
                    onClick={handleResync}
                >
                    {syncing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    Dong bo lai
                </Button>
            </AlertDescription>
        </Alert>
    );
}
