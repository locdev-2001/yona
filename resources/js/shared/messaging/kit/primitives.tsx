import { useState, type ReactNode } from 'react';

import { EXTERNAL_LINK_PROPS } from 'shared/helpers/externalLinks';

import { t } from '../../../i18n';
import { useMessageHost } from '../host';
import type { Price, StructuredAction, StructuredMessage } from '../model';
import { formatMoney, hasDiscount } from '../money';
import { ArrowRight, Check, Copy, ExternalLink, Phone } from './icons';

import './kit.css';

/** Chuỗi của kit (lang/*\/messaging.php → kit). */
export const kt = (key: string, values?: Record<string, string | number>): string => t(`MESSAGING.kit.${key}`, values);

/** Gốc mọi tin có cấu trúc: nạp token và font của kit. */
export function KitRoot({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`mk ${className}`.trim()}>{children}</div>;
}

export function Media({ src, alt = '', size }: { src?: string; alt?: string; size?: number }) {
    const [broken, setBroken] = useState(false);
    const style = size ? { width: size, height: size } : undefined;

    return (
        <span className="mk-media" style={style}>
            {src && !broken ? <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} /> : null}
        </span>
    );
}

/** Giá bán một dòng riêng; có giảm thì giá cũ gạch + nhãn đỏ ở dòng dưới. */
export function PriceBlock({ price }: { price: Price }) {
    return (
        <span className="mk-price">
            <span className="mk-price-now">{formatMoney(price.amount, price.currency)}</span>
            {hasDiscount(price) ? (
                <span className="mk-price-was">
                    <span className="mk-price-old">{formatMoney(price.compare_at, price.currency)}</span>
                    <span className="mk-sale">-{price.discount_percent}%</span>
                </span>
            ) : null}
        </span>
    );
}

const actionIcon = (action: StructuredAction) => {
    switch (action.kind) {
        case 'link':
            return <ExternalLink size={14} />;
        case 'call':
            return <Phone size={16} />;
        case 'copy':
            return <Copy size={14} />;
        case 'webview':
            return <ArrowRight size={16} />;
        default:
            return null;
    }
};

/**
 * Một nút của tin. Nút trả lời gửi câu trả lời qua host; nút khác giao cho host
 * thực thi. Hộp thư (không tương tác) vẫn vẽ nút để nhân viên thấy khách thấy gì.
 */
export function ActionButton({
    action,
    message,
    itemId,
    primary = false,
    block = false,
    onReply,
}: {
    action: StructuredAction;
    message: StructuredMessage;
    itemId?: string;
    primary?: boolean;
    block?: boolean;
    onReply?: (action: StructuredAction) => void;
}) {
    const host = useMessageHost();
    const [copied, setCopied] = useState(false);
    const className = `mk-pill ${primary ? 'mk-pill--primary' : 'mk-pill--soft'} ${block ? 'mk-pill--block' : ''}`.trim();
    const label = copied ? kt('copied') : action.label;
    const icon = copied ? <Check size={14} /> : actionIcon(action);

    if (!host.interactive) {
        return (
            <span className={className} aria-disabled="true" title={kt('read_only')}>
                {label}
                {icon}
            </span>
        );
    }

    if (action.kind === 'link' && action.url) {
        return (
            <a className={className} href={action.url} {...EXTERNAL_LINK_PROPS}>
                {label}
                {icon}
            </a>
        );
    }

    const onClick = () => {
        if (action.kind === 'reply') {
            onReply?.(action);

            return;
        }

        if (action.kind === 'copy') {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        }

        host.act(action, { message, itemId });
    };

    return (
        <button type="button" className={className} onClick={onClick} aria-label={action.kind === 'copy' ? kt('copy', { label: action.label }) : undefined}>
            {label}
            {icon}
        </button>
    );
}

/** Hành động chính: đặt mua > mở trang > trả lời > gọi > link. Nút đứng đầu danh sách không tự là chính. */
export function primaryActionIndex(actions: StructuredAction[]): number {
    const order = ['order', 'webview', 'reply', 'call', 'postback', 'link', 'copy'];
    let best = -1;

    actions.forEach((action, index) => {
        if (best === -1 || order.indexOf(action.kind) < order.indexOf(actions[best].kind)) best = index;
    });

    return best;
}

/** 1–3 nút: 2 nút xếp cặp [phụ 1fr][chính 1.3fr], còn lại xếp dọc. */
export function ActionBar({
    actions,
    message,
    itemId,
    onReply,
}: {
    actions: StructuredAction[];
    message: StructuredMessage;
    itemId?: string;
    onReply?: (action: StructuredAction) => void;
}) {
    if (actions.length === 0) return null;

    const primary = primaryActionIndex(actions);
    const ordered =
        actions.length === 2 && primary === 0 ? [actions[1], actions[0]] : actions;
    const primaryAction = actions[primary];

    return (
        <div className={`mk-actions ${actions.length === 2 ? 'mk-actions--pair' : ''}`.trim()}>
            {ordered.map((action, index) => (
                <ActionButton
                    key={`${action.kind}-${index}`}
                    action={action}
                    message={message}
                    itemId={itemId}
                    primary={action === primaryAction}
                    block={actions.length !== 2}
                    onReply={onReply}
                />
            ))}
        </div>
    );
}
