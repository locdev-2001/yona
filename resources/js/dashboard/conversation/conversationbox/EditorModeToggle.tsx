import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import { t } from '../../../i18n';

// Port từ dashboard/components/widgets/WootWriter/EditorModeToggle.vue —
// đo bề rộng 2 nhãn bằng ref (useElementSize → ResizeObserver) để tính bề rộng
// + translate của chip trượt.

interface EditorModeToggleProps {
    mode: string;
    disabled?: boolean;
    isReplyRestricted?: boolean;
    onToggleMode: () => void;
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
                reply: replyModeRef.current?.offsetWidth ?? 0,
                note: privateModeRef.current?.offsetWidth ?? 0,
            });
        };
        measure();

        const observer = new ResizeObserver(measure);
        if (replyModeRef.current) observer.observe(replyModeRef.current);
        if (privateModeRef.current) observer.observe(privateModeRef.current);
        return () => observer.disconnect();
    }, []);

    // isReplyRestricted ép về private note bất kể mode.
    const isPrivate = isReplyRestricted || mode === REPLY_EDITOR_MODES.NOTE;

    const chipWidth = `${(isPrivate ? labelWidths.note : labelWidths.reply) + 16}px`;
    const translateValue = `${isPrivate ? labelWidths.reply + 16 : 0}px`;

    return (
        <button
            className={`flex items-center w-auto h-8 p-1 transition-all border rounded-full bg-n-alpha-2 group relative duration-300 ease-in-out z-0 active:scale-[0.995] active:duration-75 ${
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
                className={`absolute shadow-sm rounded-full h-6 w-[var(--chip-width)] ease-in-out translate-x-[var(--translate-x)] rtl:translate-x-[var(--rtl-translate-x)] bg-n-solid-1 ${
                    !disabled && !isReplyRestricted ? 'transition-all duration-300' : ''
                }`}
                style={
                    {
                        '--chip-width': chipWidth,
                        '--translate-x': translateValue,
                        '--rtl-translate-x': 'calc(-1 * var(--translate-x))',
                    } as CSSProperties
                }
            />
        </button>
    );
}
