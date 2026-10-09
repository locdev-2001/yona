import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import { t } from '../../../i18n';

// Port từ dashboard/components/widgets/WootWriter/EditorModeToggle.vue —
// đo bề rộng 2 nhãn như useElementSize (ResizeObserver contentRect = KHÔNG gồm
// padding px-2), rồi +16 = 2 × 8px padding của nhãn cho chip trượt.

const LABEL_HORIZONTAL_PADDING = 16;

interface EditorModeToggleProps {
    mode: string;
    disabled?: boolean;
    isReplyRestricted?: boolean;
    onToggleMode: () => void;
}

// Bề rộng content-box của nhãn (offsetWidth trừ padding), khớp contentRect.
export function contentBoxWidth(element: HTMLElement | null): number {
    if (!element) return 0;
    const style = window.getComputedStyle(element);
    return Math.max(0, element.offsetWidth - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0'));
}

export function chipGeometry(isPrivate: boolean, replyContentWidth: number, noteContentWidth: number) {
    return {
        width: `${(isPrivate ? noteContentWidth : replyContentWidth) + LABEL_HORIZONTAL_PADDING}px`,
        translateX: `${isPrivate ? replyContentWidth + LABEL_HORIZONTAL_PADDING : 0}px`,
    };
}

export default function EditorModeToggle({
    mode,
    disabled = false,
    isReplyRestricted = false,
    onToggleMode,
}: EditorModeToggleProps) {
    const replyModeRef = useRef<HTMLDivElement>(null);
    const privateModeRef = useRef<HTMLDivElement>(null);
    const [labelWidths, setLabelWidths] = useState({ reply: 0, note: 0 });

    useLayoutEffect(() => {
        const measure = () => {
            setLabelWidths({
                reply: contentBoxWidth(replyModeRef.current),
                note: contentBoxWidth(privateModeRef.current),
            });
        };
        measure();

        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(measure);
        if (replyModeRef.current) observer.observe(replyModeRef.current);
        if (privateModeRef.current) observer.observe(privateModeRef.current);
        return () => observer.disconnect();
    }, []);

    // isReplyRestricted ép về private note bất kể mode.
    const isPrivate = isReplyRestricted || mode === REPLY_EDITOR_MODES.NOTE;
    const { width: chipWidth, translateX } = chipGeometry(isPrivate, labelWidths.reply, labelWidths.note);

    return (
        <button
            className={`flex items-center w-auto h-8 p-1 transition-all rounded-full bg-n-surface-field group relative duration-300 ease-in-out z-0 active:scale-[0.995] active:duration-75 ${
                disabled || isReplyRestricted ? 'cursor-not-allowed' : ''
            }`}
            disabled={disabled || isReplyRestricted}
            onClick={onToggleMode}
        >
            <div ref={replyModeRef} className="flex items-center gap-1 px-2 z-20">
                {t('CONVERSATION.REPLYBOX.REPLY')}
            </div>
            <div ref={privateModeRef} className="flex items-center gap-1 px-2 z-20">
                {t('CONVERSATION.REPLYBOX.PRIVATE_NOTE')}
            </div>
            <div
                data-testid="editor-mode-chip"
                className={`absolute rounded-full h-6 w-[var(--chip-width)] ease-in-out translate-x-[var(--translate-x)] rtl:translate-x-[var(--rtl-translate-x)] bg-n-surface-raised ${
                    !disabled && !isReplyRestricted ? 'transition-all duration-300' : ''
                }`}
                style={
                    {
                        '--chip-width': chipWidth,
                        '--translate-x': translateX,
                        '--rtl-translate-x': 'calc(-1 * var(--translate-x))',
                    } as CSSProperties
                }
            />
        </button>
    );
}
