import type { ReactNode } from 'react';

import Switch from 'dashboard/components-next/switch/Switch';

interface ToggleRowProps {
    label: string;
    description?: string;
    value?: boolean;
    onChange?: (value: boolean) => void;
    /** Hàng luôn bật, không tắt được (vd "Gửi tin nhắn cho shop") — hiện chữ thay vì switch. */
    lockedLabel?: string;
    /** Tính năng chưa có bộ não đứng sau (vd "Gửi yêu cầu theo loại") — hiện huy hiệu thay vì switch. */
    badge?: string;
    extra?: ReactNode;
}

// Một dòng bật/tắt của thẻ "Trang chủ" / "Thu thông tin khách": nhãn + mô tả
// bên trái, switch (hoặc chữ "Luôn bật" / huy hiệu "Sắp ra mắt") bên phải.
export default function ToggleRow({
    label,
    description = '',
    value = false,
    onChange,
    lockedLabel,
    badge,
    extra,
}: ToggleRowProps) {
    return (
        <div className={"flex items-start justify-between gap-4 py-3"}>
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-body-main font-medium text-n-slate-12">{label}</span>
                {description ? <span className="text-label-small text-n-slate-11">{description}</span> : null}
                {extra}
            </div>
            {lockedLabel ? (
                <span className="shrink-0 text-label-small text-n-slate-11 pt-0.5">{lockedLabel}</span>
            ) : badge ? (
                <span className="shrink-0 rounded-full bg-n-slate-3 text-n-slate-11 text-label-small font-medium px-2.5 py-1">
                    {badge}
                </span>
            ) : (
                <Switch value={value} ariaLabel={label} onChange={next => onChange?.(next)} />
            )}
        </div>
    );
}
