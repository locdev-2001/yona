import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { MessageHostProvider, resolveStructured, type MessageHost, type StructuredAction, type StructuredMessage } from 'shared/messaging';
import type { CardItem } from 'shared/messaging/model';

import { fetchFlowUrl, sendStructuredMessage, updateMessage } from '../api/widget';
import { IFrameHelper } from '../helpers/iframe';
import { t } from '../i18n';
import { widgetStore } from '../store/widgetStore';
import VariantSheet, { type OrderDraft } from './VariantSheet';
import WebviewSheet from './WebviewSheet';

type OpenSheet =
    | { kind: 'order'; message: StructuredMessage; item: CardItem }
    | { kind: 'webview'; title: string; url: string };

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

const cardItem = (message: StructuredMessage, itemId?: string): CardItem | undefined => {
    const model = resolveStructured(message)?.model;

    return Array.isArray(model) ? (model as CardItem[]).find(item => item.id === itemId) : undefined;
};

/**
 * Nơi DUY NHẤT widget thực thi hành động của tin có cấu trúc. Kit chỉ báo khách muốn
 * gì; ở đây gửi câu trả lời, mở sheet chọn biến thể / trang công khai, mở link, chép, gọi.
 */
export default function WidgetMessageHost({ children }: { children: ReactNode }) {
    const [sheet, setSheet] = useState<OpenSheet | null>(null);
    const close = useCallback(() => setSheet(null), []);

    const host = useMemo<MessageHost>(
        () => ({
            surface: 'widget',
            interactive: true,
            submit: async (message, values) => {
                await updateMessage({ messageId: message.id, values });
            },
            act: (action, { message, itemId }) => {
                if (action.kind === 'order') {
                    const item = cardItem(message, itemId);
                    if (item) setSheet({ kind: 'order', message, item });
                    return;
                }

                if (action.kind === 'webview' && action.page) {
                    fetchFlowUrl(message.id, action.page, itemId)
                        .then(({ url }) => setSheet({ kind: 'webview', title: action.label, url }))
                        .catch(() => widgetStore.showBanner({ message: t('WEBVIEW_SHEET.FAILED'), type: 'error' }));
                    return;
                }

                actInline(action);
            },
        }),
        [],
    );

    const sendOrder = async (message: StructuredMessage, item: CardItem, draft: OrderDraft) => {
        try {
            const sent = await sendStructuredMessage('order_request', {
                source_message_id: message.id,
                item_id: item.id,
                selections: draft.selections,
                quantity: draft.quantity,
                note: draft.note || undefined,
            });
            widgetStore.addOrUpdateMessage(sent);
            setSheet(null);
        } catch (error) {
            widgetStore.showBanner({ message: t('ORDER_SHEET.FAILED'), type: 'error' });
            throw error;
        }
    };

    return (
        <MessageHostProvider host={host}>
            {children}
            {sheet?.kind === 'order' ? (
                <VariantSheet item={sheet.item} onClose={close} onSubmit={draft => sendOrder(sheet.message, sheet.item, draft)} />
            ) : null}
            {sheet?.kind === 'webview' ? <WebviewSheet title={sheet.title} url={sheet.url} onClose={close} onSubmitted={close} /> : null}
        </MessageHostProvider>
    );
}
