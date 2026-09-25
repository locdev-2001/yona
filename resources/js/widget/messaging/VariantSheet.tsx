import { useMemo, useState } from 'react';

import { formatMoney } from 'shared/messaging';
import type { CardItem, Variant } from 'shared/messaging/model';
import { KitRoot, Media, PriceBlock } from 'shared/messaging/kit/primitives';

import { t } from '../i18n';
import Sheet, { SheetCloseButton } from '../ui/Sheet';

export interface OrderDraft {
    selections: Record<string, string>;
    quantity: number;
    note: string;
}

interface VariantSheetProps {
    item: CardItem;
    onClose: () => void;
    /** Reject thì sheet giữ nguyên để khách gửi lại. */
    onSubmit: (draft: OrderDraft) => Promise<void>;
}

const DEFAULT_MAX_QUANTITY = 99;

const firstAvailable = (variant: Variant) => variant.options.find(option => !option.disabled)?.value;

/**
 * Chọn biến thể và số lượng trước khi gửi yêu cầu đặt hàng. Giá ở đây chỉ để khách
 * xem; máy chủ tự đối chiếu với thẻ gốc, không tin số do widget gửi.
 */
export default function VariantSheet({ item, onClose, onSubmit }: VariantSheetProps) {
    const variants = item.variants ?? [];
    const [selections, setSelections] = useState<Record<string, string>>(() =>
        Object.fromEntries(variants.flatMap(variant => {
            const value = firstAvailable(variant);
            return value === undefined ? [] : [[variant.name, value]];
        })),
    );
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    const maxQuantity = item.max_quantity ?? DEFAULT_MAX_QUANTITY;
    const complete = variants.every(variant => selections[variant.name] !== undefined);
    const siteLink = item.actions.find(action => action.kind === 'link' && action.url);
    const media = useMemo(() => {
        for (const variant of variants) {
            const chosen = variant.options.find(option => option.value === selections[variant.name]);
            if (chosen?.media_url) return chosen.media_url;
        }

        return item.media_url;
    }, [item.media_url, selections, variants]);

    const submit = async () => {
        if (!complete || busy) return;
        setBusy(true);
        try {
            await onSubmit({ selections, quantity, note: note.trim() });
        } catch {
            setBusy(false);
        }
    };

    return (
        <Sheet label={item.title} onClose={onClose}>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-4 pt-4 no-scrollbar">
                <KitRoot className="flex items-start gap-3">
                    <Media src={media} size={80} />
                    <span className="mk-stack min-w-0 flex-1" style={{ gap: 3 }}>
                        <span className="mk-title" style={{ fontSize: 17 }}>
                            {item.title}
                        </span>
                        {item.price ? <PriceBlock price={item.price} /> : null}
                        {item.stock_label ? <span className="text-[13px] font-medium text-[var(--yona-chat-positive-ink)]">{item.stock_label}</span> : null}
                    </span>
                    <SheetCloseButton label={t('ORDER_SHEET.CLOSE')} onClick={onClose} />
                </KitRoot>

                {variants.map(variant => (
                    <fieldset key={variant.name} className="mt-5 flex flex-col gap-2.5 border-0 p-0">
                        <legend className="mb-2.5 flex w-full items-center justify-between text-[14px]">
                            <span className="text-[var(--yona-chat-ink-soft)]">{variant.name}</span>
                            <span className="font-semibold text-[var(--yona-chat-ink)]">
                                {variant.options.find(option => option.value === selections[variant.name])?.label}
                            </span>
                        </legend>
                        <div className="flex flex-wrap gap-2">
                            {variant.options.map(option => {
                                const selected = selections[variant.name] === option.value;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        aria-pressed={selected}
                                        aria-label={option.disabled ? t('ORDER_SHEET.SOLD_OUT', { option: option.label }) : option.label}
                                        disabled={option.disabled}
                                        className={`flex h-11 items-center gap-2 rounded-full border-[1.5px] text-[15px] transition-colors ${
                                            option.media_url ? 'ps-1.5 pe-4' : 'px-4'
                                        } ${
                                            selected
                                                ? 'border-[var(--yona-chat-ink)] bg-[var(--yona-chat-panel)] font-medium text-[var(--yona-chat-ink)]'
                                                : 'border-transparent bg-[var(--yona-chat-field)] text-[var(--yona-chat-ink)]'
                                        } disabled:text-[var(--yona-chat-ink-muted)] disabled:line-through`}
                                        onClick={() => setSelections(current => ({ ...current, [variant.name]: option.value }))}
                                    >
                                        {option.media_url ? <img src={option.media_url} alt="" className="size-8 rounded-full object-cover" /> : null}
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>
                ))}

                <div className="mt-5 flex items-center justify-between">
                    <span className="flex flex-col">
                        <span className="text-[14px] text-[var(--yona-chat-ink-soft)]">{t('ORDER_SHEET.QUANTITY')}</span>
                        {item.max_quantity ? (
                            <span className="text-[13px] text-[var(--yona-chat-ink-muted)]">{t('ORDER_SHEET.MAX', { count: maxQuantity })}</span>
                        ) : null}
                    </span>
                    <span className="flex items-center gap-3">
                        <StepButton
                            icon="i-lucide-minus"
                            label={t('ORDER_SHEET.DECREASE')}
                            disabled={quantity <= 1}
                            onClick={() => setQuantity(current => Math.max(1, current - 1))}
                        />
                        <span aria-live="polite" className="w-6 text-center text-[17px] font-semibold tabular-nums text-[var(--yona-chat-ink)]">
                            {quantity}
                        </span>
                        <StepButton
                            icon="i-lucide-plus"
                            label={t('ORDER_SHEET.INCREASE')}
                            disabled={quantity >= maxQuantity}
                            onClick={() => setQuantity(current => Math.min(maxQuantity, current + 1))}
                        />
                    </span>
                </div>

                <label className="mt-5 flex flex-col gap-2">
                    <span className="flex items-center justify-between text-[14px]">
                        <span className="text-[var(--yona-chat-ink-soft)]">{t('ORDER_SHEET.NOTE')}</span>
                        <span className="text-[var(--yona-chat-ink-muted)]">{t('ORDER_SHEET.OPTIONAL')}</span>
                    </span>
                    <input
                        value={note}
                        maxLength={300}
                        placeholder={t('ORDER_SHEET.NOTE_PLACEHOLDER')}
                        className="reset-base h-12 rounded-[14px] bg-[var(--yona-chat-field)] px-4 text-[16px] text-[var(--yona-chat-ink)] outline-none placeholder:text-[var(--yona-chat-ink-muted)] focus:ring-2 focus:ring-[var(--yona-chat-accent)]"
                        onChange={event => setNote(event.target.value)}
                    />
                </label>
            </div>

            <div className="flex flex-none flex-col gap-3 border-t border-[var(--yona-chat-line)] px-5 pb-4 pt-3">
                {item.price ? (
                    <div className="flex items-end justify-between gap-3">
                        <span className="flex flex-col">
                            <span className="text-[14px] text-[var(--yona-chat-ink-soft)]">{t('ORDER_SHEET.SUBTOTAL')}</span>
                            <span className="text-[12.5px] text-[var(--yona-chat-ink-muted)]">{t('ORDER_SHEET.SHIPPING_HINT')}</span>
                        </span>
                        <span className="text-[22px] font-bold tabular-nums text-[var(--yona-chat-ink)]">
                            {formatMoney(item.price.amount * quantity, item.price.currency)}
                        </span>
                    </div>
                ) : null}
                <button
                    type="button"
                    disabled={!complete || busy}
                    className="flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--yona-chat-accent)] text-[16px] font-semibold text-[var(--yona-chat-on-accent)] active:scale-[0.98] disabled:opacity-60"
                    onClick={() => void submit()}
                >
                    {busy ? <span className="i-lucide-loader-circle size-4 animate-spin" /> : null}
                    {t('ORDER_SHEET.SUBMIT')}
                </button>
                {siteLink?.url ? (
                    <a
                        href={siteLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 text-[14px] text-[var(--yona-chat-ink-soft)] no-underline"
                    >
                        {t('ORDER_SHEET.VIEW_SITE')}
                        <span className="i-lucide-external-link size-3.5" />
                    </a>
                ) : null}
            </div>
        </Sheet>
    );
}

function StepButton({ icon, label, disabled, onClick }: { icon: string; label: string; disabled: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            aria-label={label}
            disabled={disabled}
            className="flex size-10 items-center justify-center rounded-full bg-[var(--yona-chat-field)] text-[var(--yona-chat-ink)] active:scale-95 disabled:text-[var(--yona-chat-ink-muted)]"
            onClick={onClick}
        >
            <span className={`${icon} size-[18px]`} />
        </button>
    );
}
