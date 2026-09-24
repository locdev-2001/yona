import { useRef, useState } from 'react';

import { IFrameHelper } from '../../helpers/iframe';
import { t } from '../../i18n';
import type { CardAction, CardItem } from '../../types';

// Carousel `cards`: thẻ 190px cuộn ngang, thụt lề bằng avatar, dot chỉ vị trí,
// một CTA mỗi thẻ (hành động đầu tiên của thẻ).
const CARD_WIDTH = 190;
const CARD_GAP = 10;

function CardCta({ action }: { action: CardAction }) {
    const label = action.text || t('CARD.CTA_FALLBACK');
    const className =
        'mt-[10px] block w-full rounded-[9px] bg-[var(--yona-chat-accent)] p-[10px] text-center text-[12.5px] font-semibold leading-none text-[var(--yona-chat-on-accent)]';

    if (action.type === 'link') {
        return (
            <a className={className} href={action.uri} target="_blank" rel="noopener nofollow noreferrer">
                {label}
            </a>
        );
    }

    return (
        <button
            type="button"
            className={className}
            onClick={() => IFrameHelper.sendMessage({ event: 'postback', data: { payload: action.payload } })}
        >
            {label}
        </button>
    );
}

export default function CardsCarousel({ items }: { items: CardItem[] }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const onScroll = () => {
        const track = trackRef.current;
        if (!track) return;
        setActiveIndex(Math.min(items.length - 1, Math.round(track.scrollLeft / (CARD_WIDTH + CARD_GAP))));
    };

    return (
        <div className="yona-cards w-full">
            <div
                ref={trackRef}
                className="flex gap-[10px] overflow-x-auto pb-1 pt-[9px] ltr:pl-[34px] rtl:pr-[34px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onScroll={onScroll}
            >
                {items.map((item, index) => {
                    const cta = item.actions?.[0];
                    return (
                        <div
                            key={`${item.title}-${index}`}
                            className="w-[190px] flex-none overflow-hidden rounded-[14px] border border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)]"
                        >
                            {item.media_url ? (
                                <img src={item.media_url} alt="" className="h-[104px] w-full object-cover" />
                            ) : null}
                            <div className="px-3 pb-3 pt-[11px]">
                                <div className="text-[13px] font-semibold leading-[1.35] text-[var(--yona-chat-ink)]">
                                    {item.title}
                                </div>
                                {item.description ? (
                                    <div className="mt-[3px] text-[11.5px] leading-[1.4] text-[var(--yona-chat-ink-soft)]">
                                        {item.description}
                                    </div>
                                ) : null}
                                {cta ? <CardCta action={cta} /> : null}
                            </div>
                        </div>
                    );
                })}
            </div>
            {items.length > 1 ? (
                <div className="flex items-center justify-center gap-[6px] pt-[10px]" aria-hidden="true">
                    {items.map((item, index) => (
                        <span
                            key={`${item.title}-${index}`}
                            className={`h-[5px] rounded-[3px] ${
                                index === activeIndex ? 'w-4 bg-[var(--yona-chat-solid)]' : 'w-[5px] bg-[var(--yona-chat-dot)]'
                            }`}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
