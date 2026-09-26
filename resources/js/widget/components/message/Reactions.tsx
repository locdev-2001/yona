import { t } from '../../i18n';
import { useWidgetState } from '../../store/hooks';
import { widgetStore } from '../../store/widgetStore';
import type { MessageReaction, WidgetMessage } from '../../types';

const reactionsOf = (message: WidgetMessage): MessageReaction[] =>
    Array.isArray(message.content_attributes?.reactions) ? (message.content_attributes.reactions as MessageReaction[]) : [];

/** Biểu cảm khách đang giữ trên tin, nếu có. */
export function useMyReaction(message: WidgetMessage): string | null {
    const me = useWidgetState(state => `contact:${state.contact?.id ?? ''}`);

    return reactionsOf(message).find(reaction => reaction.by === me)?.emoji ?? null;
}

/** Bấm lại đúng biểu cảm đang giữ là gỡ; bấm cái khác là đổi. */
export function toggleReaction(message: WidgetMessage, emoji: string, mine: string | null): void {
    void widgetStore.reactToMessage(message.id, mine === emoji ? null : emoji);
}

/** Thanh 6 biểu cảm hiện trên bong bóng khi bấm nút cảm xúc. */
export function ReactionPicker({ message, onDone }: { message: WidgetMessage; onDone: () => void }) {
    const emojis = useWidgetState(state => state.messagingPolicy.reactions);
    const mine = useMyReaction(message);

    return (
        <div
            role="menu"
            aria-label={t('MESSAGE_ACTIONS.REACT')}
            className="flex items-center gap-[2px] rounded-full border border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] p-1 shadow-[var(--yona-chat-shadow-pop)]"
            onClick={event => event.stopPropagation()}
        >
            {emojis.map(emoji => (
                <button
                    key={emoji}
                    type="button"
                    role="menuitemradio"
                    aria-checked={mine === emoji}
                    aria-label={emoji}
                    className={`flex size-9 items-center justify-center rounded-full text-[22px] leading-none transition-transform hover:scale-[1.18] active:scale-95 ${
                        mine === emoji ? 'bg-[var(--yona-chat-field)]' : ''
                    }`}
                    onClick={() => {
                        toggleReaction(message, emoji, mine);
                        onDone();
                    }}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}

/** Các biểu cảm đã thả, gom theo emoji, nằm ngay dưới bong bóng. Chip của khách bấm để gỡ. */
export function ReactionSummary({ message, isOwn }: { message: WidgetMessage; isOwn: boolean }) {
    const allowed = useWidgetState(state => state.messagingPolicy.reactions);
    const mine = useMyReaction(message);
    const counts = new Map<string, number>();
    reactionsOf(message).forEach(reaction => counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1));

    if (!counts.size) return null;

    return (
        <div className={`-mt-[6px] flex flex-wrap gap-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {[...counts].map(([emoji, count]) => {
                const isMine = mine === emoji;
                const label = isMine ? t('REACTIONS.REMOVE', { emoji }) : t('REACTIONS.COUNT', { emoji, count });

                return (
                    <button
                        key={emoji}
                        type="button"
                        aria-label={label}
                        title={label}
                        disabled={!isMine && !allowed.includes(emoji)}
                        className={`flex h-[22px] items-center gap-1 rounded-full border px-[7px] text-[13px] leading-none shadow-[var(--yona-chat-shadow-chip)] ${
                            isMine
                                ? 'border-[var(--yona-chat-accent)] bg-[var(--yona-chat-accent-soft)] text-[var(--yona-chat-accent-ink)]'
                                : 'border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] text-[var(--yona-chat-ink-soft)]'
                        }`}
                        onClick={() => toggleReaction(message, emoji, mine)}
                    >
                        <span>{emoji}</span>
                        {count > 1 ? <span className="text-[11.5px] font-medium tabular-nums">{count}</span> : null}
                    </button>
                );
            })}
        </div>
    );
}
