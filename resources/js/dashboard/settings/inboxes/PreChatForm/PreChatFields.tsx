import { useRef } from 'react';
import { ICONS } from 'dashboard/icons';

import { t } from '../../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import Switch from 'dashboard/components-next/switch/Switch';
import type { PreChatField } from 'dashboard/helper/preChat';

// Port từ settings/inbox/PreChatForm/PreChatFields.vue. `vuedraggable` (Sortable)
// đổi sang HTML5 drag-and-drop của trình duyệt — cùng thao tác kéo hàng đổi thứ
// tự, không thêm phụ thuộc npm. Màn rộng là bảng một hàng một trường; màn hẹp mỗi
// trường thành một thẻ, ô nhập xuống dòng riêng. Khóa và kiểu dữ liệu của trường là
// chữ kỹ thuật nên không hiện.
type PreChatFieldToggle = 'enabled' | 'required';

interface PreChatFieldsProps {
    preChatFields: PreChatField[];
    onToggle: (type: PreChatFieldToggle, field: PreChatField) => void;
    onEdit: (type: 'label' | 'placeholder', field: PreChatField, value: string) => void;
    onReorder: (fields: PreChatField[]) => void;
}

const ROW_GRID = 'grid grid-cols-[auto_auto_minmax(0,1fr)_auto] md:grid-cols-[1rem_2.5rem_minmax(0,1fr)_minmax(0,1fr)_5.5rem]';
const INPUT_CLASS = 'w-full text-sm !mb-0 px-2 py-1 border border-n-weak rounded disabled:opacity-60';

export default function PreChatFields({ preChatFields, onToggle, onEdit, onReorder }: PreChatFieldsProps) {
    const draggedIndex = useRef<number | null>(null);

    const moveField = (from: number, to: number) => {
        if (from === to) return;
        const reordered = [...preChatFields];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(to, 0, moved);
        onReorder(reordered);
    };

    return (
        <div className="outline outline-1 -outline-offset-1 outline-n-weak rounded-xl">
            <div
                className={`hidden md:grid ${ROW_GRID} gap-x-3 items-center px-4 py-3 border-b border-n-weak text-heading-3 text-n-slate-12`}
                aria-hidden="true"
            >
                <span />
                <span />
                <span>{t('INBOX_MGMT.PRE_CHAT_FORM.SET_FIELDS_HEADER.LABEL')}</span>
                <span>{t('INBOX_MGMT.PRE_CHAT_FORM.SET_FIELDS_HEADER.PLACE_HOLDER')}</span>
                <span>{t('INBOX_MGMT.PRE_CHAT_FORM.SET_FIELDS_HEADER.REQUIRED')}</span>
            </div>
            <ul className="list-none m-0 p-0 divide-y divide-n-weak">
                {preChatFields.map((item, index) => (
                    <li
                        key={item.name}
                        draggable
                        className={`${ROW_GRID} gap-x-3 gap-y-2 items-center px-4 py-3`}
                        onDragStart={() => {
                            draggedIndex.current = index;
                        }}
                        onDragOver={event => event.preventDefault()}
                        onDrop={event => {
                            event.preventDefault();
                            if (draggedIndex.current === null) return;
                            moveField(draggedIndex.current, index);
                            draggedIndex.current = null;
                        }}
                    >
                        <Icon icon={ICONS.dragHandle} className="size-4 text-n-slate-11 cursor-move" />
                        <Switch
                            value={item.enabled}
                            ariaLabel={item.label}
                            onChange={() => onToggle('enabled', item)}
                        />
                        <span
                            className={`md:hidden text-body-main font-medium truncate ${item.enabled ? 'text-n-slate-12' : 'text-n-slate-11'}`}
                        >
                            {item.label}
                        </span>
                        <label className="flex items-center gap-2 min-h-11 justify-self-end md:justify-self-start md:order-last text-body-main text-n-slate-11">
                            <input
                                type="checkbox"
                                checked={item.required}
                                value={`${item.name}-required`}
                                disabled={!item.enabled}
                                className="m-0"
                                onChange={() => onToggle('required', item)}
                            />
                            <span className="md:sr-only">{t('INBOX_MGMT.PRE_CHAT_FORM.SET_FIELDS_HEADER.REQUIRED')}</span>
                        </label>
                        <label className="col-span-4 md:col-span-1 flex flex-col gap-1">
                            <span className="md:sr-only text-label-small text-n-slate-11">
                                {t('INBOX_MGMT.PRE_CHAT_FORM.SET_FIELDS_HEADER.LABEL')}
                            </span>
                            <input
                                type="text"
                                value={item.label}
                                disabled={!item.enabled}
                                className={INPUT_CLASS}
                                onChange={event => onEdit('label', item, event.target.value)}
                            />
                        </label>
                        <label className="col-span-4 md:col-span-1 flex flex-col gap-1">
                            <span className="md:sr-only text-label-small text-n-slate-11">
                                {t('INBOX_MGMT.PRE_CHAT_FORM.SET_FIELDS_HEADER.PLACE_HOLDER')}
                            </span>
                            <input
                                type="text"
                                value={item.placeholder ?? ''}
                                disabled={!item.enabled}
                                className={INPUT_CLASS}
                                onChange={event => onEdit('placeholder', item, event.target.value)}
                            />
                        </label>
                    </li>
                ))}
            </ul>
        </div>
    );
}
