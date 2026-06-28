import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface ZaloConnectionRow {
    id: string;
    connection_id: number;
    personal_uid: string | null;
    display_name: string | null;
    avatar_url: string | null;
    state: 'disconnected' | 'qr_waiting' | 'connected' | 'session_lost';
    session_lost_reason: string | null;
    last_connected_at: string | null;
}

interface Props {
    connections: ZaloConnectionRow[];
}

const STATE_LABELS: Record<ZaloConnectionRow['state'], string> = {
    connected: 'Đã kết nối',
    qr_waiting: 'Đang chờ QR',
    disconnected: 'Chưa kết nối',
    session_lost: 'Mất phiên',
};

const STATE_VARIANTS: Record<ZaloConnectionRow['state'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    connected: 'default',
    qr_waiting: 'secondary',
    disconnected: 'outline',
    session_lost: 'destructive',
};

interface QrLoginState {
    open: boolean;
    connectionId: number | null;
    qrToken: string | null;
    phase: string;
    qrImage: string | null;
    error: string | null;
}

const INITIAL_QR: QrLoginState = {
    open: false,
    connectionId: null,
    qrToken: null,
    phase: 'idle',
    qrImage: null,
    error: null,
};

export default function ZaloConnectionsIndex({ connections }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Tích hợp', href: '/integrations' },
        { title: 'Kết nối Zalo', href: '/integrations/zalo' },
    ];

    const [qrState, setQrState] = useState<QrLoginState>(INITIAL_QR);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Poll QR status khi đang trong phase logging_in / qr_waiting
    useEffect(() => {
        if (!qrState.open || !qrState.qrToken) return;
        if (qrState.phase === 'ready' || qrState.phase === 'error') return;

        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/integrations/zalo/qr-status?qr_token=${qrState.qrToken}`, {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                });
                const data = await res.json();
                setQrState((prev) => ({
                    ...prev,
                    phase: data.phase ?? prev.phase,
                    qrImage: data.qr_image ?? prev.qrImage,
                    error: data.error ?? prev.error,
                }));
                if (data.phase === 'ready') {
                    clearPoll();
                    // Promote bridge slot → Laravel connection
                    await promoteConnection(qrState.connectionId!, qrState.qrToken!);
                }
            } catch {
                // ignore network errors during poll
            }
        }, 2000);

        return () => clearPoll();
    }, [qrState.open, qrState.qrToken, qrState.phase]);

    const clearPoll = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };

    const startQrLogin = async () => {
        setQrState({ ...INITIAL_QR, open: true, phase: 'starting' });
        try {
            const res = await fetch('/integrations/zalo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
            });
            const data = await res.json();
            if (!data.ok) {
                setQrState((prev) => ({ ...prev, phase: 'error', error: data.message ?? 'Lỗi không xác định' }));
                return;
            }
            setQrState((prev) => ({
                ...prev,
                connectionId: data.connection_id,
                qrToken: data.qr_token,
                phase: 'logging_in',
            }));
        } catch (e) {
            setQrState((prev) => ({ ...prev, phase: 'error', error: String(e) }));
        }
    };

    const promoteConnection = async (connectionId: number, qrToken: string) => {
        try {
            const res = await fetch('/integrations/zalo/promote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ connection_id: connectionId, qr_token: qrToken }),
            });
            const data = await res.json();
            if (data.ok) {
                setQrState((prev) => ({ ...prev, phase: 'done' }));
                router.reload({ only: ['connections'] });
            } else {
                setQrState((prev) => ({ ...prev, phase: 'error', error: data.message ?? 'promote_failed' }));
            }
        } catch (e) {
            setQrState((prev) => ({ ...prev, phase: 'error', error: String(e) }));
        }
    };

    const disconnectConnection = (id: string) => {
        if (!confirm('Xác nhận ngắt kết nối Zalo này?')) return;
        router.delete(`/integrations/zalo/${id}`, {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Kết nối Zalo" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">Kết nối Zalo cá nhân</h2>
                            <p className="text-muted-foreground text-sm">Quản lý tài khoản Zalo cá nhân kết nối vào workspace.</p>
                        </div>
                        <Button onClick={startQrLogin} disabled={qrState.open && qrState.phase !== 'done' && qrState.phase !== 'error'}>
                            + Thêm tài khoản Zalo
                        </Button>
                    </div>

                    {/* QR Panel */}
                    {qrState.open && (
                        <div className="space-y-4 rounded-lg border p-6">
                            <h3 className="font-medium">Đăng nhập bằng mã QR</h3>
                            {qrState.phase === 'starting' && <p className="text-muted-foreground text-sm">Đang khởi động...</p>}
                            {(qrState.phase === 'logging_in' || qrState.phase === 'qr_waiting') && !qrState.qrImage && (
                                <p className="text-muted-foreground text-sm">Đang tạo mã QR...</p>
                            )}
                            {qrState.qrImage && (
                                <div className="space-y-2">
                                    <p className="text-sm">Mở Zalo trên điện thoại và quét mã QR bên dưới:</p>
                                    <img src={qrState.qrImage} alt="Zalo QR Code" className="h-48 w-48 rounded border" />
                                </div>
                            )}
                            {qrState.phase === 'ready' && <p className="text-sm text-green-600">Đăng nhập thành công! Đang kết nối...</p>}
                            {qrState.phase === 'done' && <p className="text-sm text-green-600">Kết nối hoàn tất.</p>}
                            {qrState.phase === 'error' && <p className="text-sm text-red-600">Lỗi: {qrState.error}</p>}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    clearPoll();
                                    setQrState(INITIAL_QR);
                                }}
                            >
                                Đóng
                            </Button>
                        </div>
                    )}

                    {/* Connection list */}
                    {connections.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Chưa có tài khoản Zalo nào. Nhấn "Thêm tài khoản Zalo" để bắt đầu.</p>
                    ) : (
                        <div className="divide-y rounded-lg border">
                            {connections.map((conn) => (
                                <div key={conn.id} className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {conn.avatar_url && <img src={conn.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />}
                                        <div>
                                            <p className="text-sm font-medium">
                                                {conn.display_name ?? conn.personal_uid ?? `#${conn.connection_id}`}
                                            </p>
                                            {conn.session_lost_reason && <p className="text-xs text-red-500">{conn.session_lost_reason}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant={STATE_VARIANTS[conn.state]}>{STATE_LABELS[conn.state]}</Badge>
                                        {conn.state === 'session_lost' && (
                                            <Button size="sm" variant="outline" onClick={startQrLogin}>
                                                Đăng nhập lại
                                            </Button>
                                        )}
                                        <Button size="sm" variant="destructive" onClick={() => disconnectConnection(conn.id)}>
                                            Ngắt kết nối
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function getCsrfToken(): string {
    return (document.cookie.match(/XSRF-TOKEN=([^;]+)/) ?? [])[1] ? decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) ?? [])[1]) : '';
}
