import { CHAR_LENGTH_WARNING, REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';

import EditorModeToggle from './EditorModeToggle';

// Port từ dashboard/components/widgets/WootWriter/ReplyTopPanel.vue —
// khối bên phải (copilot + nút phóng to editor) nằm trong v-if="captainTasksEnabled"
// nên không render ở B3 (không có Captain EE). Phím tắt Alt+P/Alt+L bỏ (B10).

interface ReplyTopPanelProps {
    mode: string;
    isReplyRestricted?: boolean;
    disabled?: boolean;
    isMessageLengthReachingThreshold: boolean;
    charactersRemaining: number;
    onSetReplyMode: (mode: string) => void;
}

export default function ReplyTopPanel({
    mode,
    isReplyRestricted = false,
    disabled = false,
    isMessageLengthReachingThreshold,
    charactersRemaining,
    onSetReplyMode,
}: ReplyTopPanelProps) {
    const handleModeToggle = () => {
        const newMode = mode === REPLY_EDITOR_MODES.REPLY ? REPLY_EDITOR_MODES.NOTE : REPLY_EDITOR_MODES.REPLY;
        onSetReplyMode(newMode);
    };

    const charLengthClass = charactersRemaining < 0 ? 'text-n-ruby-9' : 'text-n-slate-11';
    const characterLengthWarning =
        charactersRemaining < 0
            ? `${-charactersRemaining} ${CHAR_LENGTH_WARNING.NEGATIVE}`
            : `${charactersRemaining} ${CHAR_LENGTH_WARNING.UNDER_50}`;

    return (
        <div className="flex justify-between gap-2 h-[3.25rem] items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2">
            <EditorModeToggle
                mode={mode}
                disabled={disabled}
                isReplyRestricted={isReplyRestricted}
                onToggleMode={handleModeToggle}
            />
            <div className="flex items-center mx-4 my-0">
                {isMessageLengthReachingThreshold && (
                    <div className="text-xs">
                        <span className={charLengthClass}>{characterLengthWarning}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
