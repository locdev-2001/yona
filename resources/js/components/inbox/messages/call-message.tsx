import { cn } from '@/lib/utils';
import { Phone, PhoneMissed, Video } from 'lucide-react';
import type { CallMeta, ChatMessage } from '../message-types';

function formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function callSummary(call: CallMeta): { label: string; missed: boolean; video: boolean } {
    const video = call.media === 'video' || call.type === 2 || call.type === 'video';
    const seconds = call.duration_seconds ?? call.duration ?? 0;
    const outcome = call.outcome ?? (seconds > 0 ? 'completed' : 'missed');
    const kind = video ? 'video' : 'thoại';

    switch (outcome) {
        case 'completed':
            return { label: `Cuộc gọi ${kind} · ${formatDuration(seconds)}`, missed: false, video };
        case 'busy':
            return { label: `Cuộc gọi ${kind} · máy bận`, missed: true, video };
        case 'canceled':
            return { label: `Cuộc gọi ${kind} đã hủy`, missed: true, video };
        default:
            return { label: `Cuộc gọi ${kind} nhỡ`, missed: true, video };
    }
}

/** Dòng cuộc gọi: loại (thoại/video), kết cục (nhỡ/bận/hủy), thời lượng. */
export function CallMessage({ msg }: { msg: ChatMessage }) {
    const { label, missed, video } = callSummary(msg.media_meta?.call ?? {});
    const Icon = missed ? PhoneMissed : video ? Video : Phone;

    return (
        <div className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', missed ? 'text-red-400' : 'opacity-80')} />
            <span>{label}</span>
        </div>
    );
}
