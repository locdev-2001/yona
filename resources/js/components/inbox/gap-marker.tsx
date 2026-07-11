import { AlertTriangle, Info } from 'lucide-react';

export interface GapEvent {
    item_type: 'event';
    id: string;
    kind: string;
    gap_started_at: string;
    gap_ended_at: string | null;
    stream_at: string;
    /** P08 — dòng hệ thống (group_system/friend_system): {act, label}. */
    payload?: { act?: string; label?: string } | null;
    conversation_id?: string;
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/** P05 gap marker + P08 dòng hệ thống (đổi tên nhóm, thành viên vào/ra, kết bạn). */
export function GapMarker({ event }: { event: GapEvent }) {
    // P08 — dòng hệ thống: xám trung tính, label build sẵn từ server
    if (event.kind === 'group_system' || event.kind === 'friend_system') {
        return (
            <div className="my-2 flex items-center justify-center">
                <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                    <Info className="h-3 w-3" />
                    {event.payload?.label ?? 'Sự kiện hệ thống'} · {formatTime(event.stream_at)}
                </span>
            </div>
        );
    }

    const start = formatTime(event.gap_started_at);
    const end = event.gap_ended_at ? formatTime(event.gap_ended_at) : null;

    return (
        <div className="my-3 flex items-center justify-center">
            <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-500">
                <AlertTriangle className="h-3 w-3" />
                Có thể thiếu tin nhắn · {start}
                {end ? ` – ${end}` : ''}
            </span>
        </div>
    );
}
