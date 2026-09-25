import { useMemo, type ReactNode } from 'react';

import { MessageHostProvider, type MessageHost, type StructuredAction } from 'shared/messaging';

import { updateMessage } from '../api/widget';
import { IFrameHelper } from '../helpers/iframe';

/**
 * Nơi DUY NHẤT widget thực thi hành động của tin có cấu trúc. Kit chỉ báo khách
 * muốn gì; ở đây gửi câu trả lời lên server, mở link, chép, gọi.
 * ponytail: `webview` và `order` mở sheet (trang công khai, chọn biến thể) — thêm ở phase 5.
 */
function act(action: StructuredAction): void {
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

export default function WidgetMessageHost({ children }: { children: ReactNode }) {
    const host = useMemo<MessageHost>(
        () => ({
            surface: 'widget',
            interactive: true,
            submit: async (message, values) => {
                await updateMessage({ messageId: message.id, values });
            },
            act,
        }),
        [],
    );

    return <MessageHostProvider host={host}>{children}</MessageHostProvider>;
}
