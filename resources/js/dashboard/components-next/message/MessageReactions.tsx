import { useEffect, useRef, useState } from 'react';

import { t } from '../../../i18n';
import { ORIENTATION } from './constants';
import { useMessageContext } from './provider';
import { groupReactions, isAgentReaction, readReactions, summarizeReactions } from './helpers/reactions';
import type { ReactionGroup } from './helpers/reactions';

// Viên cảm xúc đè mép dưới bong bóng, ở góc phía người gửi. Bấm viên mở danh
// sách ai thả gì; dòng cảm xúc của mình bấm lại là gỡ.
// `data-yona-reactions` để so ảnh giao diện loại trừ được phần này.

function reactorLabels(group: ReactionGroup, resolveName: (by: string) => string | null): string[] {
    const labels = group.reactedBy.map(by => (isAgentReaction(by) ? t('CONVERSATION.REACTIONS.YOU') : resolveName(by)));

    return [...new Set(labels.filter((label): label is string => Boolean(label)))];
}

export default function MessageReactions() {
    const { contentAttributes, orientation, onToggleReaction, resolveReactorName } = useMessageContext();
    const [isListOpen, setIsListOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isListOpen) return undefined;
        const closeOnOutside = (event: Event) => {
            if (containerRef.current?.contains(event.target as Node)) return;
            setIsListOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsListOpen(false);
        };
        document.addEventListener('mousedown', closeOnOutside);
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.removeEventListener('mousedown', closeOnOutside);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isListOpen]);

    const groups = groupReactions(readReactions(contentAttributes));
    if (groups.length === 0) return null;

    const { topEmojis, total } = summarizeReactions(groups);
    const reactedBySelf = groups.some(group => group.reactedBySelf);
    const isRight = orientation === ORIENTATION.RIGHT;
    const pillSideClass = isRight ? 'ltr:right-2 rtl:left-2' : 'ltr:left-2 rtl:right-2';
    const listSideClass = isRight ? 'ltr:right-0 rtl:left-0' : 'ltr:left-0 rtl:right-0';
    const resolveName = resolveReactorName ?? (() => null);

    return (
        <div ref={containerRef} className={`absolute -bottom-3.5 z-10 ${pillSideClass}`}>
            <button
                type="button"
                data-yona-reactions
                aria-haspopup="dialog"
                aria-expanded={isListOpen}
                aria-label={t('CONVERSATION.REACTIONS.SUMMARY', { count: total })}
                className={`flex items-center gap-0.5 h-6 px-1.5 rounded-full border text-sm leading-none shadow-sm cursor-pointer transition-colors duration-150 bg-n-solid-2 hover:bg-n-solid-3 ${
                    reactedBySelf ? 'border-n-brand/50' : 'border-n-weak'
                }`}
                onClick={event => {
                    event.stopPropagation();
                    setIsListOpen(open => !open);
                }}
            >
                {topEmojis.map(emoji => (
                    <span key={emoji}>{emoji}</span>
                ))}
                {total > 1 ? <span className="ms-0.5 text-xs text-n-slate-11">{total}</span> : null}
            </button>
            {isListOpen ? (
                <div
                    role="dialog"
                    aria-label={t('CONVERSATION.REACTIONS.TITLE')}
                    className={`absolute bottom-8 w-60 max-w-[calc(100vw-2rem)] p-1 rounded-xl border border-n-weak bg-n-solid-2 shadow-lg ${listSideClass}`}
                    onClick={event => event.stopPropagation()}
                >
                    <ul className="flex flex-col list-none m-0 p-0">
                        {groups.map(group => {
                            const labels = reactorLabels(group, resolveName);
                            const canRemove = group.reactedBySelf && Boolean(onToggleReaction);
                            const rowClass = `flex w-full items-center gap-2 min-h-10 px-2 rounded-lg text-start ${
                                group.reactedBySelf ? 'bg-n-brand/10' : ''
                            }`;
                            const rowContent = (
                                <>
                                    <span className="text-lg leading-none">{group.emoji}</span>
                                    <span className="flex-1 min-w-0">
                                        {labels.length > 0 ? (
                                            <span className="block text-sm truncate text-n-slate-12">
                                                {labels.join(', ')}
                                            </span>
                                        ) : null}
                                        {canRemove ? (
                                            <span className="block text-xs text-n-slate-11">
                                                {t('CONVERSATION.REACTIONS.TAP_TO_REMOVE')}
                                            </span>
                                        ) : null}
                                    </span>
                                    <span className="text-xs text-n-slate-11">{group.count}</span>
                                </>
                            );

                            return (
                                <li key={group.emoji} className="list-none">
                                    {canRemove ? (
                                        <button
                                            type="button"
                                            data-testid="reaction-row"
                                            aria-pressed
                                            className={`${rowClass} cursor-pointer hover:bg-n-alpha-2`}
                                            onClick={() => {
                                                onToggleReaction?.(group.emoji);
                                                setIsListOpen(false);
                                            }}
                                        >
                                            {rowContent}
                                        </button>
                                    ) : (
                                        <div data-testid="reaction-row" className={rowClass}>
                                            {rowContent}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
