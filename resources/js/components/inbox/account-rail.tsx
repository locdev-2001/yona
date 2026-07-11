import { cn } from '@/lib/utils';

export interface ChannelAccountInfo {
    id: string;
    channel: string;
    display_name: string | null;
    avatar_url: string | null;
    status: 'needs_qr' | 'connected' | 'session_lost';
    conversations_count: number;
}

const CHANNEL_BADGE: Record<string, string> = {
    zalo_personal: 'Z',
    messenger: 'M',
    tiktok: 'T',
};

interface Props {
    accounts: ChannelAccountInfo[];
    totalCount: number;
    activeAccountId: string | null;
    onSelect: (accountId: string | null) => void;
}

/** P07 — rail trái 2 tầng: lọc theo tài khoản kết nối (shop có thể cắm nhiều số Zalo). */
export function AccountRail({ accounts, totalCount, activeAccountId, onSelect }: Props) {
    // Rail = filter hội thoại của account đang hoạt động (connected/session_lost).
    // needs_qr (đang chờ quét lần đầu) không có hội thoại để lọc — ConnectionBanner lo phần nhắc.
    const activeAccounts = accounts.filter((acc) => acc.status !== 'needs_qr');
    if (activeAccounts.length === 0) return null;

    return (
        <div className="border-b">
            <RailRow label="Tất cả hộp thư" count={totalCount} active={activeAccountId === null} onClick={() => onSelect(null)} />
            {activeAccounts.map((acc) => (
                <RailRow
                    key={acc.id}
                    label={acc.display_name ?? 'Tài khoản chưa đặt tên'}
                    count={acc.conversations_count}
                    active={activeAccountId === acc.id}
                    badge={CHANNEL_BADGE[acc.channel] ?? '?'}
                    needsAttention={acc.status === 'session_lost' || acc.status === 'needs_qr'}
                    onClick={() => onSelect(acc.id)}
                />
            ))}
        </div>
    );
}

function RailRow({
    label,
    count,
    active,
    badge,
    needsAttention,
    onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    badge?: string;
    needsAttention?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            className={cn('hover:bg-muted/50 flex w-full items-center justify-between px-4 py-2 text-sm', active && 'bg-muted font-medium')}
            onClick={onClick}
        >
            <span className="flex min-w-0 items-center gap-2">
                {badge && (
                    <span className="bg-muted-foreground/10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold">
                        {badge}
                    </span>
                )}
                <span className="truncate">{label}</span>
                {needsAttention && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" title="Cần quét lại QR" />}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs">{count}</span>
        </button>
    );
}
