import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import { useAlert } from 'dashboard/composables/useAlert';
import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { t } from '../../../../i18n';

// Port từ routes/dashboard/conversation/contact/ContactInfoRow.vue —
// dòng thông tin (email/phone/…): link, copy, sửa inline (Enter lưu, Esc hủy).
//
// Lệch có chủ đích (ux-deviations.md): trường rỗng KHÔNG in "Không có sẵn" nữa.
// Sửa được thì thành nút hành động "Thêm …" (bấm là vào ô nhập), không sửa được
// thì không chiếm dòng. Chỗ đắt nhất của panel phải nói được điều gì đó có ích.
interface ContactInfoRowProps {
    href?: string;
    icon: string;
    emoji: string;
    value?: string | null;
    showCopy?: boolean;
    editable?: boolean;
    title?: string;
    // Nội dung nối sau value (gốc nhúng HTML cờ quốc gia qua v-dompurify-html).
    trailing?: ReactNode;
    // Nhãn nút "Thêm …" khi trường rỗng và sửa được.
    addLabel?: string;
    onUpdate?: (value: string) => void;
}

function RowIcon({ icon, emoji }: { icon: string; emoji: string }) {
    return (
        <span className="flex-shrink-0 ltr:ml-1 rtl:mr-1 inline-flex items-center" title={emoji}>
            <FluentIcon icon={icon} size="14" />
        </span>
    );
}

export default function ContactInfoRow({
    href = '',
    icon,
    emoji,
    value = '',
    showCopy = false,
    editable = false,
    title = '',
    trailing = null,
    addLabel = '',
    onUpdate,
}: ContactInfoRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) inputRef.current?.focus();
    }, [isEditing]);

    const onCopy = async (event: MouseEvent) => {
        event.preventDefault();
        try {
            await copyTextToClipboard(value ?? '');
            useAlert(t('CONTACT_PANEL.COPY_SUCCESSFUL'));
        } catch {
            // headless/không quyền clipboard — im lặng như gốc
        }
    };

    const startEditing = (event?: MouseEvent) => {
        event?.preventDefault();
        if (!editable) return;
        setEditValue(value || '');
        setIsEditing(true);
    };

    const saveEdit = () => {
        if (!isEditing) return;
        setIsEditing(false);
        const trimmed = editValue.trim();
        if (trimmed !== (value || '')) onUpdate?.(trimmed);
    };

    const editButton = editable ? (
        <NextButton
            ghost
            xs
            slate
            className="ltr:-ml-1 rtl:-mr-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
            icon="i-lucide-pencil"
            onClick={startEditing}
        />
    ) : null;

    const valueNode = (
        <span className="overflow-hidden text-sm whitespace-nowrap text-ellipsis inline-flex items-center gap-1" title={value ?? ''}>
            {value}
            {trailing}
        </span>
    );

    // Rỗng: sửa được → nút "Thêm …"; không sửa được → không render dòng nào.
    if (!value && !isEditing) {
        if (!editable) return null;

        return (
            <button
                type="button"
                className="group/row flex items-center gap-2 h-5 ltr:-ml-1 rtl:-mr-1 text-n-slate-11 hover:text-n-slate-12 cursor-pointer"
                onClick={() => startEditing()}
            >
                <RowIcon icon={icon} emoji={emoji} />
                <span className="text-sm inline-flex items-center gap-1">
                    <span className="i-lucide-plus size-3" aria-hidden="true" />
                    {addLabel || title}
                </span>
            </button>
        );
    }

    return (
        <div className="group/row w-full h-5 ltr:-ml-1 rtl:-mr-1">
            {isEditing ? (
                <div className="flex items-center w-full min-w-0 gap-2">
                    <RowIcon icon={icon} emoji={emoji} />
                    <input
                        ref={inputRef}
                        value={editValue}
                        placeholder={title}
                        className="w-full min-w-0 bg-transparent text-sm text-n-slate-12 outline-none border-b border-n-weak"
                        onChange={event => setEditValue(event.target.value)}
                        onKeyDown={event => {
                            if (event.key === 'Enter') saveEdit();
                            if (event.key === 'Escape') setIsEditing(false);
                        }}
                        onBlur={saveEdit}
                    />
                </div>
            ) : href ? (
                <a href={href} className="flex items-center gap-2 text-n-slate-11 hover:underline">
                    <RowIcon icon={icon} emoji={emoji} />
                    {valueNode}
                    {showCopy ? (
                        <NextButton ghost xs slate className="ltr:-ml-1 rtl:-mr-1" icon="i-lucide-clipboard" onClick={onCopy} />
                    ) : null}
                    {editButton}
                </a>
            ) : (
                <div className="flex items-center gap-2 text-n-slate-11">
                    <RowIcon icon={icon} emoji={emoji} />
                    {valueNode}
                    {editButton}
                </div>
            )}
        </div>
    );
}
