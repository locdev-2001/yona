import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import type { ChannelAccountInfo } from './account-rail';
import { type ChannelDescriptorMap, descriptorFor } from './channel-descriptor';

/**
 * Nhắc từng tài khoản kênh cần kết nối lại.
 *
 * Nút "Kết nối lại" chỉ hiện khi kênh khai một trang kết nối. Kênh nội bộ không
 * có trang nào, và route của phích cắm ngoài chỉ tồn tại khi kênh đó đang bật —
 * gọi `route()` với tên chưa đăng ký là ném lỗi và trắng cả trang.
 */
export function ConnectionBanner({ accounts, descriptors }: { accounts: ChannelAccountInfo[]; descriptors?: ChannelDescriptorMap }) {
    const needsAttention = accounts.filter((acc) => acc.status === 'session_lost' || acc.status === 'needs_qr');

    if (needsAttention.length === 0) return null;

    return (
        <>
            {needsAttention.map((acc) => {
                const descriptor = descriptorFor(descriptors, acc.channel);

                return (
                    <Alert
                        key={acc.id}
                        variant={acc.status === 'session_lost' ? 'destructive' : 'default'}
                        className="rounded-none border-x-0 px-3 py-2"
                    >
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                            <span>
                                Tài khoản <strong>{acc.display_name ?? descriptor.label}</strong>{' '}
                                {acc.status === 'session_lost' ? 'mất kết nối. Tin nhắn mới có thể chưa nhận được.' : 'chưa kết nối.'} Cần quét lại
                                QR.
                            </span>
                            {descriptor.connectRouteName && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="ml-3 h-7 shrink-0"
                                    onClick={() => router.visit(route(descriptor.connectRouteName!))}
                                >
                                    Kết nối lại
                                </Button>
                            )}
                        </AlertDescription>
                    </Alert>
                );
            })}
        </>
    );
}
