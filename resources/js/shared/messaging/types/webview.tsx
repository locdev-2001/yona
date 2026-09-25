import type { ReactNode } from 'react';

import { useMessageHost } from '../host';
import type { StructuredMessage } from '../model';
import { isRecord, records, text } from '../parse';
import { defineMessageType } from '../registry';
import { Calendar, ChevronRight, ClipboardList, Landmark, ShoppingBag, Truck } from '../kit/icons';
import { KitRoot, kt } from '../kit/primitives';

// Thẻ "mở trang để thao tác": trang công khai của Yona (chọn lịch, form dài, tra
// đơn…). Widget mở trong sheet, kênh khác nhận link. Lịch có khung giờ thì hiện
// sẵn 2 khung đầu + "+N" để khách thấy còn chỗ trước khi mở.

const PAGE_ICON: Record<string, ReactNode> = {
    schedule: <Calendar />,
    form: <ClipboardList />,
    order_tracking: <Truck />,
    product: <ShoppingBag />,
    bank_transfer: <Landmark />,
};

interface WebviewModel {
    page: string;
    title: string;
    subtitle?: string;
    slots: string[];
}

const PREVIEW_SLOTS = 2;

function WebviewView({ model, message }: { model: WebviewModel; message: StructuredMessage }) {
    const host = useMessageHost();
    const open = () => host.act({ kind: 'webview', label: model.title, page: model.page }, { message });
    const more = model.slots.length - PREVIEW_SLOTS;

    const body = (
        <>
            <span className="mk-row">
                <span className="mk-tile mk-tile--accent">{PAGE_ICON[model.page] ?? <ChevronRight />}</span>
                <span className="mk-stack" style={{ flex: 1 }}>
                    <span className="mk-title">{model.title}</span>
                    {model.subtitle ? <span className="mk-meta">{model.subtitle}</span> : null}
                </span>
                <span className="mk-round-icon">
                    <ChevronRight size={16} />
                </span>
            </span>
            {model.slots.length ? (
                <span className="mk-row" style={{ gap: 6 }}>
                    {model.slots.slice(0, PREVIEW_SLOTS).map(slot => (
                        <span key={slot} className="mk-slot">
                            {slot}
                        </span>
                    ))}
                    {more > 0 ? <span className="mk-slot mk-slot--more">{kt('more', { count: more })}</span> : null}
                </span>
            ) : null}
        </>
    );

    return (
        <KitRoot>
            {host.interactive ? (
                <button type="button" className="mk-card mk-pad mk-link-card" style={{ flexDirection: 'column', alignItems: 'stretch' }} onClick={open}>
                    {body}
                </button>
            ) : (
                <div className="mk-card mk-pad">{body}</div>
            )}
        </KitRoot>
    );
}

export default defineMessageType<WebviewModel>({
    contentType: 'webview',
    content: 'host',
    side: 'agent',
    parse: attributes => {
        const page = text(attributes.page);
        const title = text(attributes.title);
        if (!page || !title) return null;

        const data = isRecord(attributes.data) ? attributes.data : {};
        const slots = (records(data.slots) ?? []).flatMap(slot => (text(slot.label) ? [String(slot.label)] : []));

        return { page, title, subtitle: text(attributes.subtitle), slots };
    },
    View: WebviewView,
});
