import type { Price } from '../model';
import { formatPrice } from '../money';
import { price, safeUrl, text } from '../parse';
import { defineMessageType } from '../registry';
import { ShoppingBag } from '../kit/icons';
import { KitRoot, kt, Media } from '../kit/primitives';

// Yêu cầu đặt hàng khách gửi từ sheet "Đặt mua": thẻ tối phía khách. Không phải đơn
// hàng — nhân viên báo phí giao và xác nhận trong chat.

interface OrderRequestModel {
    title: string;
    mediaUrl?: string;
    selection?: string;
    quantity: number;
    total?: Price;
    note?: string;
}

function OrderRequestView({ model }: { model: OrderRequestModel }) {
    const detail = [model.selection, `× ${model.quantity}`].filter(Boolean).join(' · ');

    return (
        <KitRoot>
            <div className="mk-request">
                <span className="mk-row mk-meta" style={{ gap: 8, fontSize: 13 }}>
                    <ShoppingBag size={16} />
                    {kt('order_request')}
                </span>
                <div className="mk-row">
                    <Media src={model.mediaUrl} size={52} />
                    <span className="mk-stack" style={{ flex: 1 }}>
                        <span className="mk-title" style={{ fontSize: 14 }}>
                            {model.title}
                        </span>
                        <span className="mk-meta">{detail}</span>
                    </span>
                    {model.total ? (
                        <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>{formatPrice(model.total)}</span>
                    ) : null}
                </div>
                {model.note ? <span className="mk-request-note">{kt('note', { note: model.note })}</span> : null}
            </div>
        </KitRoot>
    );
}

export default defineMessageType<OrderRequestModel>({
    contentType: 'order_request',
    content: 'view',
    side: 'contact',
    parse: attributes => {
        const title = text(attributes.title);
        const quantity = attributes.quantity;
        if (!title || typeof quantity !== 'number') return null;

        return {
            title,
            quantity,
            mediaUrl: safeUrl(attributes.media_url),
            selection: text(attributes.selection_label),
            total: price(attributes.total),
            note: text(attributes.note),
        };
    },
    View: OrderRequestView,
});
