import { t } from '../../../i18n';
import type { OrderStatus, Price, StructuredMessage } from '../model';
import { formatPrice } from '../money';
import { price, safeUrl, text } from '../parse';
import { defineMessageType } from '../registry';
import { Truck } from '../kit/icons';
import { ActionButton, KitRoot, kt } from '../kit/primitives';

// Thẻ trạng thái đơn: đầu tối (mã, trạng thái, ngày dự kiến) + thanh 4 đoạn + tổng
// một dòng + "Theo dõi đơn". Dữ liệu từ payload, Yona không có bảng đơn hàng.

const STATUSES: OrderStatus[] = ['placed', 'confirmed', 'shipped', 'delivering', 'delivered', 'cancelled'];
const STEPS = ['placed', 'shipped', 'delivering', 'delivered'] as const;
/** Vị trí trên thanh 4 đoạn; "confirmed" vẫn ở đoạn đầu. */
const STEP_OF: Record<OrderStatus, number> = { placed: 0, confirmed: 0, shipped: 1, delivering: 2, delivered: 3, cancelled: -1 };

interface OrderStatusModel {
    ref: string;
    status: OrderStatus;
    eta?: string;
    total?: Price;
    feeIncluded: boolean;
    trackingUrl?: string;
}

const formatEta = (eta: string): string => {
    const [, month, day] = eta.split('-');

    return `${day}/${month}`;
};

function OrderStatusView({ model, message }: { model: OrderStatusModel; message: StructuredMessage }) {
    const current = STEP_OF[model.status];

    return (
        <KitRoot>
            <div className="mk-card">
                <div className="mk-order-head">
                    <span className="mk-stack" style={{ flex: 1 }}>
                        <span className="mk-meta">{kt('order_ref', { ref: model.ref })}</span>
                        <span style={{ fontSize: 18, fontWeight: 600 }}>{t(`MESSAGING.order_status.statuses.${model.status}`)}</span>
                        {model.eta ? <span className="mk-meta">{kt('eta', { date: formatEta(model.eta) })}</span> : null}
                    </span>
                    <span className="mk-tile mk-tile--accent">
                        <Truck />
                    </span>
                </div>
                <div className="mk-pad">
                    {current >= 0 ? (
                        <div className="mk-stack" style={{ gap: 6 }}>
                            <div className="mk-steps" aria-hidden="true">
                                {STEPS.map((step, index) => (
                                    <span key={step} className="mk-step" data-state={index < current || model.status === 'delivered' ? 'done' : index === current ? 'current' : 'todo'} />
                                ))}
                            </div>
                            <div className="mk-step-labels">
                                {STEPS.map((step, index) => (
                                    <span key={step} data-current={index === current}>
                                        {kt(`steps.${step}`)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    {model.total ? (
                        <div className="mk-split">
                            <span className="mk-meta" style={{ fontSize: 13 }}>
                                {model.feeIncluded ? kt('fee_included') : kt('total')}
                            </span>
                            <span className="mk-price-now">{formatPrice(model.total)}</span>
                        </div>
                    ) : null}
                    {model.trackingUrl ? (
                        <ActionButton action={{ kind: 'link', label: kt('track_order'), url: model.trackingUrl }} message={message} block />
                    ) : null}
                </div>
            </div>
        </KitRoot>
    );
}

export default defineMessageType<OrderStatusModel>({
    contentType: 'order_status',
    content: 'host',
    side: 'agent',
    parse: attributes => {
        const ref = text(attributes.order_ref);
        const status = attributes.status as OrderStatus;
        if (!ref || !STATUSES.includes(status)) return null;

        return {
            ref,
            status,
            eta: typeof attributes.eta === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(attributes.eta) ? attributes.eta : undefined,
            total: price(attributes.total),
            feeIncluded: attributes.fee_included === true,
            trackingUrl: safeUrl(attributes.tracking_url),
        };
    },
    View: OrderStatusView,
});
