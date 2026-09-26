import { useMemo, useState } from 'react';

import { formatMoney } from 'shared/messaging/money';
import type { CardItem } from 'shared/messaging/model';
import { price, records, safeUrl, text } from 'shared/messaging/parse';
import { Media, PriceBlock } from 'shared/messaging/kit/primitives';

import { t } from '../../i18n';
import { submitFlow } from '../api';
import type { FlowPageProps } from '../registry';

// Trang "product": chi tiết một thẻ trong `cards` + nút "Đặt mua" gửi
// order_request về ĐÚNG hội thoại. Máy chủ (OrderRequestType) tự đối chiếu biến
// thể/giá với thẻ gốc — trang này KHÔNG tự tính hay gửi giá lên.
function parseItem(data: Record<string, unknown>): CardItem | null {
    const title = text(data.title);
    if (!title) return null;

    const variants = (records(data.variants) ?? []).flatMap(variant => {
        const name = text(variant.name);
        const options = (records(variant.options) ?? []).flatMap(option =>
            text(option.value)
                ? [
                      {
                          value: String(option.value),
                          label: text(option.label) ?? String(option.value),
                          media_url: safeUrl(option.media_url),
                          disabled: option.disabled === true,
                      },
                  ]
                : [],
        );

        return name && options.length > 0 ? [{ name, options }] : [];
    });

    return {
        id: text(data.id) ?? 'item-1',
        title,
        description: text(data.description),
        media_url: safeUrl(data.media_url),
        price: price(data.price),
        stock_label: text(data.stock_label),
        max_quantity: typeof data.max_quantity === 'number' ? data.max_quantity : undefined,
        variants: variants.length > 0 ? variants : undefined,
        actions: [],
    };
}

export default function ProductFlow({ flow, token, onSubmitted }: FlowPageProps) {
    const item = useMemo(() => parseItem(flow.data), [flow.data]);
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!item) {
        return (
            <div className="flow-body">
                <p className="flow-note">{t('FLOWS.not_found')}</p>
            </div>
        );
    }

    const max = item.max_quantity ?? 999;
    const missingVariant = (item.variants ?? []).some(variant => !selections[variant.name]);
    const currentMedia = (item.variants ?? []).reduce<string | undefined>((media, variant) => {
        const option = variant.options.find(candidate => candidate.value === selections[variant.name]);

        return option?.media_url ?? media;
    }, item.media_url);

    const submit = async () => {
        if (missingVariant || sending) return;

        setSending(true);
        setError(null);

        try {
            await submitFlow(token, {
                selections: Object.entries(selections).map(([name, value]) => ({ name, value })),
                quantity,
                note: note.trim() || undefined,
            });
            onSubmitted();
        } catch (submitError) {
            setError((submitError as Error).message || t('FLOWS.send_failed'));
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <div className="flow-body">
                <div className="mk-row" style={{ alignItems: 'flex-start' }}>
                    {currentMedia ? <Media src={currentMedia} alt={item.title} size={88} /> : null}
                    <div className="mk-stack">
                        <span className="mk-title">{item.title}</span>
                        {item.price ? <PriceBlock price={item.price} /> : null}
                        {item.stock_label ? <span className="mk-meta">{item.stock_label}</span> : null}
                    </div>
                </div>
                {item.description ? <p className="flow-note">{item.description}</p> : null}
                {(item.variants ?? []).map(variant => (
                    <div key={variant.name} className="flow-section">
                        <span className="flow-section-title">{variant.name}</span>
                        <div className="flow-slots" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
                            {variant.options.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className="flow-slot"
                                    aria-pressed={selections[variant.name] === option.value}
                                    disabled={option.disabled}
                                    onClick={() => setSelections(current => ({ ...current, [variant.name]: option.value }))}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                <div className="flow-section">
                    <span className="flow-section-title">
                        {t('FLOWS.product.quantity')} · {t('FLOWS.product.max_quantity', { max })}
                    </span>
                    <div className="mk-row">
                        <button
                            type="button"
                            className="mk-pill mk-pill--soft mk-pill--icon"
                            aria-label="-"
                            disabled={quantity <= 1}
                            onClick={() => setQuantity(current => Math.max(1, current - 1))}
                        >
                            −
                        </button>
                        <span style={{ minWidth: 24, textAlign: 'center' }}>{quantity}</span>
                        <button
                            type="button"
                            className="mk-pill mk-pill--soft mk-pill--icon"
                            aria-label="+"
                            disabled={quantity >= max}
                            onClick={() => setQuantity(current => Math.min(max, current + 1))}
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="mk-field">
                    <label className="mk-label" htmlFor="flow-product-note">
                        {t('FLOWS.product.note_label')}
                    </label>
                    <input
                        id="flow-product-note"
                        className="mk-input"
                        placeholder={t('FLOWS.product.note_placeholder')}
                        value={note}
                        maxLength={300}
                        onChange={event => setNote(event.target.value)}
                    />
                </div>
                {item.price ? (
                    <div className="mk-split">
                        <span className="mk-meta">{t('FLOWS.product.subtotal')}</span>
                        <span className="mk-price-now">{formatMoney(item.price.amount * quantity, item.price.currency)}</span>
                    </div>
                ) : null}
                {missingVariant ? <p className="flow-note">{t('FLOWS.product.select_variant')}</p> : null}
                {error ? <p className="mk-error">{error}</p> : null}
            </div>
            <div className="flow-footer">
                <button type="button" className="mk-pill mk-pill--primary mk-pill--block" disabled={missingVariant || sending} onClick={() => void submit()}>
                    {t('FLOWS.product.submit')}
                </button>
            </div>
        </>
    );
}
