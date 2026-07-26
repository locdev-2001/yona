import { cn } from '@/lib/utils';
import type { QuoteMeta } from './message-types';

/** Nội dung tin được trả lời: text, hoặc nhãn theo loại nếu là media/sticker. */
function quoteLabel(quote: QuoteMeta): string {
    if (quote.text && quote.text.trim()) return quote.text;
    const t = `${quote.attach_type ?? ''} ${quote.msg_type ?? ''}`;
    if (/photo|image|gif/i.test(t)) return '[Hình ảnh]';
    if (/video/i.test(t)) return '[Video]';
    if (/voice|audio/i.test(t)) return '[Tin nhắn thoại]';
    if (/file/i.test(t)) return '[Tệp đính kèm]';
    if (/sticker/i.test(t) || quote.sticker_ref) return '[Sticker]';
    return quote.thumb ? '[Hình ảnh]' : 'Tin được trả lời';
}

interface Props {
    quote: QuoteMeta;
    mine: boolean;
}

/** Trích dẫn tin được trả lời, nằm trong bong bóng phía trên nội dung. */
export function MessageQuote({ quote, mine }: Props) {
    const sender = quote.sender_name ?? quote.sender?.name ?? null;

    return (
        <div
            className={cn(
                'mb-1 flex items-center gap-2 rounded border-l-2 py-0.5 pr-2 pl-2 text-xs',
                mine
                    ? 'border-primary-foreground/50 bg-primary-foreground/10 text-primary-foreground/85'
                    : 'border-foreground/30 bg-foreground/5 text-muted-foreground',
            )}
        >
            {quote.thumb && <img src={quote.thumb} alt="" className="h-9 w-9 shrink-0 rounded object-cover" loading="lazy" decoding="async" />}
            <div className="min-w-0">
                {sender && <div className="font-medium">{sender}</div>}
                <div className="line-clamp-2 break-words opacity-90">{quoteLabel(quote)}</div>
            </div>
        </div>
    );
}
