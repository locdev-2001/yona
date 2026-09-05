import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import WootEditor from 'dashboard/components/widgets/WootWriter/Editor';
import type { EditorHandle } from 'dashboard/components/widgets/WootWriter/Editor';
import type { UISettings } from 'dashboard/composables/useUISettings';

// Port từ dashboard/components-next/Editor/Editor.vue — vỏ có viền, nhãn, bộ đếm
// ký tự và dòng thông báo quanh WootEditor. Bỏ: chữ ký/biến/copilot (các nhóm sau).
type MessageType = 'info' | 'error' | 'success';

const MESSAGE_CLASSES: Record<MessageType, string> = {
    error: 'text-n-ruby-9 dark:text-n-ruby-9',
    success: 'text-n-teal-10 dark:text-n-teal-10',
    info: 'text-n-slate-11 dark:text-n-slate-11',
};

interface EditorProps {
    value: string;
    onChange: (value: string) => void;
    uiSettings: UISettings;
    editorKey?: string;
    label?: string;
    placeholder?: string;
    focusOnMount?: boolean;
    maxLength?: number;
    showCharacterCount?: boolean;
    disabled?: boolean;
    message?: string;
    messageType?: MessageType;
    enableCannedResponses?: boolean;
    className?: string;
    // slot `actions` của bản gốc: thay chỗ bộ đếm ký tự.
    actions?: ReactNode;
}

export default function Editor({
    value,
    onChange,
    uiSettings,
    editorKey = '',
    label = '',
    placeholder = '',
    focusOnMount = false,
    maxLength = 200,
    showCharacterCount = true,
    disabled = false,
    message = '',
    messageType = 'info',
    enableCannedResponses = true,
    className = '',
    actions,
}: EditorProps) {
    const editorRef = useRef<EditorHandle>(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (focusOnMount) editorRef.current?.focusEditorInputField('end');
    }, [focusOnMount]);

    // watch modelValue của bản gốc: cắt bớt khi vượt hạn mức (trừ khi có slot actions).
    useEffect(() => {
        if (maxLength && showCharacterCount && !actions && value.length > maxLength) {
            onChange(value.slice(0, maxLength));
        }
    }, [value, maxLength, showCharacterCount, actions, onChange]);

    const borderClasses = disabled
        ? 'cursor-not-allowed opacity-50 pointer-events-none !bg-n-alpha-black2 disabled:border-n-weak dark:disabled:border-n-weak'
        : isFocused
          ? 'border-n-brand dark:border-n-brand'
          : messageType === 'error'
            ? 'border-n-ruby-8 dark:border-n-ruby-8 hover:border-n-ruby-9 dark:hover:border-n-ruby-9'
            : 'hover:border-n-slate-6 dark:hover:border-n-slate-6 border-n-weak dark:border-n-weak';

    return (
        <div className={`flex flex-col min-w-0 gap-1 ${className}`.trim()}>
            {label ? <label className="mb-0.5 text-sm font-medium text-n-slate-12">{label}</label> : null}
            <div
                className={`flex flex-col w-full gap-2 px-3 py-3 transition-all duration-500 ease-in-out border rounded-lg editor-wrapper bg-n-alpha-black2 ${borderClasses}`}
            >
                <WootEditor
                    ref={editorRef}
                    editorId={editorKey}
                    value={value}
                    placeholder={placeholder}
                    disabled={disabled}
                    uiSettings={uiSettings}
                    enableCannedResponses={enableCannedResponses}
                    onChange={newValue => {
                        if (!disabled) onChange(newValue);
                    }}
                    onFocus={() => {
                        if (!disabled) setIsFocused(true);
                    }}
                    onBlur={() => {
                        if (!disabled) setIsFocused(false);
                    }}
                />
                {showCharacterCount || actions ? (
                    <div className="flex items-center justify-end h-4 ltr:right-3 rtl:left-3">
                        {actions ?? (
                            <span className="text-xs tabular-nums text-n-slate-10">
                                {value.length} / {maxLength}
                            </span>
                        )}
                    </div>
                ) : null}
            </div>
            {message ? (
                <p
                    className={`min-w-0 mt-1 mb-0 text-xs truncate transition-all duration-500 ease-in-out ${MESSAGE_CLASSES[messageType]}`}
                >
                    {message}
                </p>
            ) : null}
        </div>
    );
}
