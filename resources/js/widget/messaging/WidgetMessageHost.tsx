import { useMemo, type ReactNode } from 'react';

import { MessageHostProvider, type MessageHost, type StructuredAction } from 'shared/messaging';

import { updateMessage } from '../api/widget';
import { IFrameHelper } from '../helpers/iframe';
import { widgetStore } from '../store/widgetStore';

/** Hành động không cần sheet: mở link, gọi, chép, postback về trang của shop. */
function actInline(action: StructuredAction): void {
    switch (action.kind) {
        case 'link':
            if (action.url) window.open(action.url, '_blank', 'noopener,noreferrer');
            break;
        case 'call':
            if (action.phone) window.open(`tel:${action.phone.replace(/[^\d+]/g, '')}`, '_top');
            break;
        case 'copy':
            if (action.value) void navigator.clipboard?.writeText(action.value).catch(() => undefined);
            break;
        case 'postback':
            IFrameHelper.sendMessage({ event: 'postback', data: { payload: action.payload } });
            break;
        default:
            break;
    }
}

/**
 * Nơi DUY NHẤT widget thực thi hành động của tin có cấu trúc. Kit chỉ báo khách muốn
 * gì; ở đây gửi câu trả lời, mở link, chép, gọi.
 */
export default function WidgetMessageHost({ children }: { children: ReactNode }) {
    const host = useMemo<MessageHost>(
        () => ({
            surface: 'widget',
            interactive: true,
            submit: async (message, values) => {
                const response = await updateMessage({ messageId: message.id, values });
                // Hiện ngay tin trả lời của khách và đánh dấu tin gốc đã trả lời (chip ẩn đi),
                // realtime tới sau chỉ cập nhật đè đúng hai tin này.
                if (response.submitted_values) {
                    widgetStore.updateMessageContentAttributes(message.id, { submitted_values: response.submitted_values });
                }
                if (response.message) widgetStore.addOrUpdateMessage(response.message);
            },
            act: actInline,
        }),
        [],
    );

    return (
        <MessageHostProvider host={host}>
            {children}
        </MessageHostProvider>
    );
}
