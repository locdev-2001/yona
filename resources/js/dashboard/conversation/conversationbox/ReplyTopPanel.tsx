import NextButton from 'dashboard/components-next/button/Button';
import { CHAR_LENGTH_WARNING, REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';

import EditorModeToggle from './EditorModeToggle';

// Port từ dashboard/components/widgets/WootWriter/ReplyTopPanel.vue.
// Khối bên phải hiện theo cờ account `captain_tasks` (useCaptain →
// isCloudFeatureEnabled, mặc định bật trong features.yml): nút ✨ copilot giữ
// pixel (CopilotMenuBar thuộc nhóm captain sau), nút ⤢ nối toggleEditorSize thật.
// Phím tắt Alt+P/Alt+L bỏ (B10).

interface ReplyTopPanelProps {
    mode: string;
    isReplyRestricted?: boolean;
    disabled?: boolean;
    isEditorDisabled?: boolean;
    captainTasksEnabled?: boolean;
    isMessageLengthReachingThreshold: boolean;
    charactersRemaining: number;
    onSetReplyMode: (mode: string) => void;
    onToggleEditorSize?: () => void;
}

export default function ReplyTopPanel({
    mode,
    isReplyRestricted = false,
    disabled = false,
    isEditorDisabled = false,
    captainTasksEnabled = false,
    isMessageLengthReachingThreshold,
    charactersRemaining,
    onSetReplyMode,
    onToggleEditorSize,
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
            {captainTasksEnabled ? (
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <NextButton
                            ghost
                            disabled={disabled || isEditorDisabled}
                            className="text-n-violet-9 hover:enabled:!bg-n-violet-3"
                            sm
                            icon="i-ph-sparkle-fill"
                        />
                    </div>
                    <NextButton
                        ghost
                        className="text-n-slate-11"
                        sm
                        icon="i-lucide-maximize-2"
                        onClick={onToggleEditorSize}
                    />
                </div>
            ) : null}
        </div>
    );
}
