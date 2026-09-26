import { useEffect, useRef, useState } from 'react';

import { t } from '../../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import type { WidgetPreviewConfig } from './types';

// Port từ dashboard/modules/widget-preview/components/WidgetFooter.vue —
// ResizableTextArea của gốc thay bằng textarea rows=1 (khung xem trước không gõ
// nội dung nên phần tự giãn không đổi DOM).
interface WidgetFooterProps {
    config: WidgetPreviewConfig;
}

// ResizableTextArea gốc tự focus trong mounted() khi chưa có nội dung — nhờ vậy
// ô nhập của khung xem trước hiện viền focus ngay lúc bật Chat mode.
function WidgetChatInput() {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isInputFocused, setInputFocused] = useState(false);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    return (
        <div
            className={`flex items-center h-10 bg-white rounded-md ${
                isInputFocused ? 'ring-2 ring-n-brand' : ''
            }`}
        >
            <textarea
                id="chat-input"
                ref={textareaRef}
                rows={1}
                placeholder={t('INBOX_MGMT.WIDGET_BUILDER.FOOTER.CHAT_INPUT_PLACEHOLDER')}
                className="flex-grow !bg-white border-0 outline-none !outline-0 border-none h-8 text-sm pb-0 !pt-1.5 resize-none px-3 !mb-0 focus:outline-none rounded-md"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
            />
            <div className="flex items-center gap-2 px-2">
                <FluentIcon icon="emoji" />
                <FluentIcon className="icon-send" icon="send" />
            </div>
        </div>
    );
}

export default function WidgetFooter({ config }: WidgetFooterProps) {
    const statusText = config.isOnline
        ? t('INBOX_MGMT.WIDGET_BUILDER.BODY.TEAM_AVAILABILITY.ONLINE')
        : t('INBOX_MGMT.WIDGET_BUILDER.BODY.TEAM_AVAILABILITY.OFFLINE');

    return (
        <div className="relative flex flex-col w-full px-4">
            {config.isDefaultScreen ? (
                <div className="p-4 rounded-md shadow-sm bg-n-background">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium leading-4 text-n-slate-12">
                                {statusText}
                            </div>
                            <div className="mt-1 text-xs text-n-slate-11">{config.replyTime}</div>
                        </div>
                        <Avatar name="C" size={34} roundedFull />
                    </div>
                    <button
                        className="inline-flex items-center justify-between px-2 py-1 mt-1 -ml-2 font-medium leading-6 bg-transparent rounded-md text-n-slate-12"
                        style={{ color: config.color }}
                    >
                        <span className="pr-2 text-xs">
                            {t('INBOX_MGMT.WIDGET_BUILDER.FOOTER.START_CONVERSATION_BUTTON_TEXT')}
                        </span>
                        <FluentIcon icon="arrow-right" size="14" />
                    </button>
                </div>
            ) : (
                <WidgetChatInput />
            )}
        </div>
    );
}
