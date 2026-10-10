import { useEffect, useRef, useState } from 'react';
import { ICONS } from 'dashboard/icons';
import { isProductFeatureVisible } from 'shared/helpers/productVisibility';

import NextButton from 'dashboard/components-next/button/Button';
import { CHAR_LENGTH_WARNING, REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';

import CopilotMenuBar from './CopilotMenuBar';
import EditorModeToggle from './EditorModeToggle';

// Port từ dashboard/components/widgets/WootWriter/ReplyTopPanel.vue.
// Khối bên phải hiện theo cờ account `captain_tasks` (useCaptain →
// isCloudFeatureEnabled, mặc định bật trong features.yml): nút ✨ mở
// CopilotMenuBar (item bấm chỉ đóng menu — tác vụ captain thuộc nhóm sau), nút ⤢
// nối toggleEditorSize thật. Phím tắt Alt+P/Alt+L bỏ (B10).

interface ReplyTopPanelProps {
    mode: string;
    // Bản nháp chưa có hội thoại thì chưa có chỗ để ghi chú riêng.
    allowPrivateNote?: boolean;
    isReplyRestricted?: boolean;
    disabled?: boolean;
    isEditorDisabled?: boolean;
    captainTasksEnabled?: boolean;
    conversationId?: number | null;
    hasContent?: boolean;
    isMessageLengthReachingThreshold: boolean;
    charactersRemaining: number;
    onSetReplyMode: (mode: string) => void;
    onToggleEditorSize?: () => void;
    onExecuteCopilotAction?: (actionKey: string) => void;
}

export default function ReplyTopPanel({
    mode,
    allowPrivateNote = true,
    isReplyRestricted = false,
    disabled = false,
    isEditorDisabled = false,
    captainTasksEnabled = false,
    conversationId = null,
    hasContent = false,
    isMessageLengthReachingThreshold,
    charactersRemaining,
    onSetReplyMode,
    onToggleEditorSize,
    onExecuteCopilotAction,
}: ReplyTopPanelProps) {
    const [showCopilotMenu, setShowCopilotMenu] = useState(false);
    const copilotWrapperRef = useRef<HTMLDivElement>(null);

    // v-on-click-outside với ignore nút toggle: click ngoài khối (nút + menu) → đóng.
    useEffect(() => {
        if (!showCopilotMenu) return undefined;
        const onMouseDown = (event: MouseEvent) => {
            if (copilotWrapperRef.current?.contains(event.target as Node)) return;
            setShowCopilotMenu(false);
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [showCopilotMenu]);

    const handleModeToggle = () => {
        const newMode = mode === REPLY_EDITOR_MODES.REPLY ? REPLY_EDITOR_MODES.NOTE : REPLY_EDITOR_MODES.REPLY;
        onSetReplyMode(newMode);
    };

    const handleCopilotAction = (actionKey: string) => {
        setShowCopilotMenu(false);
        onExecuteCopilotAction?.(actionKey);
    };

    const charLengthClass = charactersRemaining < 0 ? 'text-n-ruby-9' : 'text-n-slate-11';
    const characterLengthWarning =
        charactersRemaining < 0
            ? `${-charactersRemaining} ${CHAR_LENGTH_WARNING.NEGATIVE}`
            : `${charactersRemaining} ${CHAR_LENGTH_WARNING.UNDER_50}`;

    return (
        <div className="flex justify-between gap-2 h-[3.25rem] items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2">
            {allowPrivateNote ? (
                <EditorModeToggle
                    mode={mode}
                    disabled={disabled}
                    isReplyRestricted={isReplyRestricted}
                    onToggleMode={handleModeToggle}
                />
            ) : (
                <span />
            )}
            <div className="flex items-center mx-4 my-0">
                {isMessageLengthReachingThreshold && (
                    <div className="text-xs">
                        <span className={charLengthClass}>{characterLengthWarning}</span>
                    </div>
                )}
            </div>
            {captainTasksEnabled ? (
                <div className="flex items-center gap-2">
                    {isProductFeatureVisible('integrations') ? (
                        <div ref={copilotWrapperRef} className="relative">
                            <NextButton
                                ghost
                                disabled={disabled || isEditorDisabled}
                                className={
                                    showCopilotMenu
                                        ? 'text-n-violet-9 bg-n-violet-3'
                                        : 'text-n-violet-9 hover:enabled:!bg-n-violet-3'
                                }
                                sm
                                icon={ICONS.ai}
                                onClick={() => setShowCopilotMenu(open => !open)}
                            />
                            {showCopilotMenu ? (
                                <CopilotMenuBar
                                    hasContent={hasContent}
                                    conversationId={conversationId}
                                    replyMode={mode}
                                    className="ltr:right-0 rtl:left-0 bottom-full mb-2"
                                    onExecuteCopilotAction={handleCopilotAction}
                                />
                            ) : null}
                        </div>
                    ) : null}
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
