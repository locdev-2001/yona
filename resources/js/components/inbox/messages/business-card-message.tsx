import { Contact } from 'lucide-react';
import type { ChatMessage } from '../message-types';

/** Danh thiếp khách gửi: avatar + tên + SĐT + link hồ sơ + QR (nếu kênh resolve được). */
export function BusinessCardMessage({ msg }: { msg: ChatMessage }) {
    const card = msg.media_meta?.business_card ?? {};

    return (
        <div className="flex min-w-[220px] items-center gap-3">
            {card.thumbnail ? (
                <img src={card.thumbnail} alt={card.name ?? 'Danh thiếp'} className="h-10 w-10 shrink-0 rounded-full object-cover" loading="lazy" />
            ) : (
                <span className="bg-background/80 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <Contact className="h-5 w-5 opacity-80" />
                </span>
            )}
            <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate font-medium">{card.name ?? 'Danh thiếp'}</div>
                {card.title && <div className="truncate text-xs opacity-70">{card.title}</div>}
                {card.phone && <div className="text-xs opacity-80">{card.phone}</div>}
                {card.url && (
                    <a href={card.url} target="_blank" rel="noreferrer" className="text-xs underline opacity-80 hover:opacity-100">
                        Xem hồ sơ
                    </a>
                )}
            </div>
            {card.qr_code_url && (
                <a href={card.qr_code_url} target="_blank" rel="noreferrer" className="shrink-0">
                    <img src={card.qr_code_url} alt="QR danh thiếp" className="h-14 w-14 rounded bg-white object-contain p-0.5" loading="lazy" />
                </a>
            )}
        </div>
    );
}
