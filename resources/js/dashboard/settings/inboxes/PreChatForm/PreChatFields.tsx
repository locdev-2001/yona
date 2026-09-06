import { useRef } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import Switch from 'dashboard/components-next/switch/Switch';
import type { PreChatField } from 'dashboard/helper/preChat';

// Port từ settings/inbox/PreChatForm/PreChatFields.vue. `vuedraggable` (Sortable)
// đổi sang HTML5 drag-and-drop của trình duyệt — cùng thao tác kéo hàng đổi thứ
// tự, không thêm phụ thuộc npm.
type PreChatFieldToggle = 'enabled' | 'required';

interface PreChatFieldsProps {
    preChatFields: PreChatField[];
    onToggle: (type: PreChatFieldToggle, field: PreChatField) => void;
    onEdit: (type: 'label' | 'placeholder', field: PreChatField, value: string) => void;
    onReorder: (fields: PreChatField[]) => void;
}

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
        <tbody>
            {preChatFields.map((item, index) => (
                <tr
                    key={item.name}
                    draggable
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
                    <td className="py-4 ltr:pl-4 ltr:pr-3 rtl:pl-3 rtl:pr-4 text-body-main">
                        <Icon icon="i-woot-drag-indicator" className="size-4 text-n-slate-11 mt-1 cursor-move" />
                    </td>
                    <td className="py-4 ltr:pr-3 rtl:pl-3 text-body-main">
                        <Switch value={item.enabled} onChange={() => onToggle('enabled', item)} />
                    </td>
                    <td
                        className={`py-4 ltr:pr-3 rtl:pl-3 text-body-main ${item.enabled ? '' : 'text-n-slate-11'}`.trim()}
                    >
                        {item.name}
                    </td>
                    <td
                        className={`py-4 ltr:pr-3 rtl:pl-3 text-body-main ${item.enabled ? '' : 'text-n-slate-11'}`.trim()}
                    >
                        {item.type}
                    </td>
                    <td className="py-4 ltr:pr-3 rtl:pl-3 text-body-main">
                        <input
                            type="checkbox"
                            checked={item.required}
                            value={`${item.name}-required`}
                            disabled={!item.enabled}
                            className="m-0"
                            onChange={() => onToggle('required', item)}
                        />
                    </td>
                    <td
                        className={`py-4 ltr:pr-3 rtl:pl-3 text-body-main ${item.enabled ? '' : 'text-n-slate-11'}`.trim()}
                    >
                        <input
                            type="text"
                            value={item.label}
                            disabled={!item.enabled}
                            className="w-full text-sm !mb-0 px-2 py-1 border border-n-weak rounded"
                            onChange={event => onEdit('label', item, event.target.value)}
                        />
                    </td>
                    <td
                        className={`py-4 ltr:pr-4 rtl:pl-4 text-body-main ${item.enabled ? '' : 'text-n-slate-11'}`.trim()}
                    >
                        <input
                            type="text"
                            value={item.placeholder ?? ''}
                            disabled={!item.enabled}
                            className="w-full text-sm !mb-0 px-2 py-1 border border-n-weak rounded"
                            onChange={event => onEdit('placeholder', item, event.target.value)}
                        />
                    </td>
                </tr>
            ))}
        </tbody>
    );
}
