import { formatPrice } from 'shared/messaging/money';
import type { OrderStatus, Price } from 'shared/messaging/model';

import { t } from '../../i18n';
import type { FlowPageProps } from '../registry';

// Trang "order_tracking": chỉ xem, dành cho kênh không vẽ được thẻ order_status
// gốc (Zalo/SMS). Cùng cách trình bày với order-status.tsx trong tin.
const STATUSES: OrderStatus[] = ['placed', 'confirmed', 'shipped', 'delivering', 'delivered', 'cancelled'];
const STEPS = ['placed', 'shipped', 'delivering', 'delivered'] as const;
const STEP_OF: Record<OrderStatus, number> = { placed: 0, confirmed: 0, shipped: 1, delivering: 2, delivered: 3, cancelled: -1 };

function formatEta(eta: string): string {
    const [, month, day] = eta.split('-');

    return `${day}/${month}`;
}

export default function OrderTrackingFlow({ flow }: FlowPageProps) {
    const data = flow.data;
    const ref = typeof data.order_ref === 'string' ? data.order_ref : '';
    const status = STATUSES.includes(data.status as OrderStatus) ? (data.status as OrderStatus) : 'placed';
    const eta = typeof data.eta === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.eta) ? data.eta : null;
    const total = data.total as Price | undefined;
    const feeIncluded = data.fee_included === true;
    const trackingUrl = typeof data.tracking_url === 'string' ? data.tracking_url : null;
    const current = STEP_OF[status];

    return (
        <div className="flow-body">
            <div className="flow-section">
                <span className="flow-section-title">{t('FLOWS.order_tracking.ref', { ref })}</span>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{t(`FLOWS.order_tracking.statuses.${status}`)}</span>
                {eta ? <span className="flow-note">{t('FLOWS.order_tracking.eta', { date: formatEta(eta) })}</span> : null}
            </div>
            {current >= 0 ? (
                <div className="flow-section">
                    <div className="mk-steps" aria-hidden="true">
                        {STEPS.map((step, index) => (
                            <span
                                key={step}
                                className="mk-step"
                                data-state={index < current || status === 'delivered' ? 'done' : index === current ? 'current' : 'todo'}
                            />
                        ))}
                    </div>
                </div>
            ) : null}
            {total ? (
                <div className="mk-split">
                    <span className="mk-meta">{feeIncluded ? t('FLOWS.order_tracking.fee_included') : t('FLOWS.order_tracking.total')}</span>
                    <span className="mk-price-now">{formatPrice(total)}</span>
                </div>
            ) : null}
            {trackingUrl ? (
                <a className="mk-pill mk-pill--soft mk-pill--block" href={trackingUrl} target="_blank" rel="noopener nofollow noreferrer">
                    {t('FLOWS.order_tracking.track_order')}
                </a>
            ) : null}
        </div>
    );
}
