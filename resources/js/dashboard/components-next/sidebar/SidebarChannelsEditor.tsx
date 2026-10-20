import { useState } from 'react';
import type { HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import { closestInsideGroup } from 'shared/reorder/closestInsideGroup';
import type { ArrangedChannel } from './useChannelPreferences';

// Kéo như thẻ hội thoại ghim: bản sao dòng (DragOverlay, portal vào body) bay tự do theo
// con trỏ, dòng gốc đứng lại làm khoảng trống, chỉ các dòng kênh trượt; kéo ra ngoài
// danh sách thì thả là về chỗ cũ. Kéo bằng tay nắm để chạm vào ô tên vẫn sửa được.
const DRAG_ACTIVATION_DISTANCE = 6;
// Sidebar chỉ cuộn dọc khi kéo sát mép, không bao giờ cuộn ngang.
const VERTICAL_AUTO_SCROLL = { threshold: { x: 0, y: 0.2 } };

interface SidebarChannelsEditorProps {
    channels: ArrangedChannel[];
    onReorder: (orderedInboxIds: number[]) => void;
    onToggleHidden: (inboxId: number) => void;
    onRename: (inboxId: number, alias: string) => void;
    onDone: () => void;
}

export default function SidebarChannelsEditor({
    channels,
    onReorder,
    onToggleHidden,
    onRename,
    onDone,
}: SidebarChannelsEditorProps) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE } }));
    const inboxIds = channels.map(channel => channel.inbox.id);
    const [draggedInboxId, setDraggedInboxId] = useState<number | null>(null);
    const draggedChannel = channels.find(channel => channel.inbox.id === draggedInboxId) ?? null;

    const onDragStart = ({ active }: DragStartEvent) => setDraggedInboxId(Number(active.id));

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        setDraggedInboxId(null);
        if (!over || active.id === over.id) return;
        onReorder(arrayMove(inboxIds, inboxIds.indexOf(Number(active.id)), inboxIds.indexOf(Number(over.id))));
    };

    return (
        <div className="ms-3 flex flex-col gap-0.5 py-1">
            <DndContext
                sensors={sensors}
                collisionDetection={closestInsideGroup}
                autoScroll={VERTICAL_AUTO_SCROLL}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragCancel={() => setDraggedInboxId(null)}
            >
                <SortableContext items={inboxIds} strategy={verticalListSortingStrategy}>
                    {channels.map(channel => (
                        <SortableChannelRow
                            key={channel.inbox.id}
                            channel={channel}
                            onToggleHidden={onToggleHidden}
                            onRename={onRename}
                        />
                    ))}
                </SortableContext>
                {createPortal(
                    <DragOverlay>
                        {draggedChannel ? (
                            <div className="overlay-surface rounded-lg cursor-grabbing">
                                <ChannelRowContent channel={draggedChannel} />
                            </div>
                        ) : null}
                    </DragOverlay>,
                    document.body,
                )}
            </DndContext>
            <Button solid sm className="mt-1" label={t('SIDEBAR.CHANNEL_PREFERENCES.DONE')} onClick={onDone} />
        </div>
    );
}

function SortableChannelRow({
    channel,
    onToggleHidden,
    onRename,
}: {
    channel: ArrangedChannel;
    onToggleHidden: (inboxId: number) => void;
    onRename: (inboxId: number, alias: string) => void;
}) {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
        id: channel.inbox.id,
    });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={`rounded-lg ${isDragging ? 'bg-n-slate-3 [&>*]:invisible' : 'hover:bg-n-surface-hover'}`}
        >
            <ChannelRowContent
                channel={channel}
                dragHandleProps={{ ...attributes, ...listeners }}
                onToggleHidden={onToggleHidden}
                onRename={onRename}
            />
        </div>
    );
}

// Một dòng kênh, dùng cho cả dòng trong danh sách lẫn bản sao đang bay (không truyền thao tác).
function ChannelRowContent({
    channel,
    dragHandleProps,
    onToggleHidden,
    onRename,
}: {
    channel: ArrangedChannel;
    dragHandleProps?: HTMLAttributes<HTMLElement>;
    onToggleHidden?: (inboxId: number) => void;
    onRename?: (inboxId: number, alias: string) => void;
}) {
    const { inbox, label, isHidden } = channel;
    const labelClass = isHidden ? 'text-n-slate-9 line-through' : 'text-n-slate-12';

    return (
        <div className="flex h-8 min-w-0 items-center gap-1 pe-1">
            <button
                type="button"
                {...dragHandleProps}
                aria-label={t('SIDEBAR.CHANNEL_PREFERENCES.DRAG')}
                title={t('SIDEBAR.CHANNEL_PREFERENCES.DRAG')}
                className="grid size-6 shrink-0 cursor-grab touch-none place-content-center rounded-md text-n-slate-10 active:cursor-grabbing"
            >
                <Icon icon="i-lucide-grip-vertical" className="size-3.5" />
            </button>
            <span className={`grid size-4 shrink-0 place-content-center ${isHidden ? 'opacity-40' : ''}`}>
                <ChannelIcon inbox={inbox} className="size-4" />
            </span>
            {onRename ? (
                <input
                    key={label}
                    defaultValue={label}
                    placeholder={inbox.name}
                    title={inbox.name}
                    aria-label={t('SIDEBAR.CHANNEL_PREFERENCES.RENAME')}
                    onBlur={event => onRename(inbox.id, event.currentTarget.value)}
                    onKeyDown={event => {
                        if (event.key === 'Enter') event.currentTarget.blur();
                        if (event.key === 'Escape') {
                            event.currentTarget.value = label;
                            event.currentTarget.blur();
                        }
                    }}
                    className={`h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-sm hover:border-n-weak focus:border-n-brand focus:outline-none ${labelClass}`}
                />
            ) : (
                <span className={`min-w-0 flex-1 truncate px-1.5 text-sm ${labelClass}`}>{label}</span>
            )}
            <button
                type="button"
                onClick={() => onToggleHidden?.(inbox.id)}
                aria-pressed={isHidden}
                aria-label={t(isHidden ? 'SIDEBAR.CHANNEL_PREFERENCES.SHOW' : 'SIDEBAR.CHANNEL_PREFERENCES.HIDE')}
                title={t(isHidden ? 'SIDEBAR.CHANNEL_PREFERENCES.SHOW' : 'SIDEBAR.CHANNEL_PREFERENCES.HIDE')}
                className="grid size-6 shrink-0 place-content-center rounded-md text-n-slate-10 hover:bg-n-surface-hover hover:text-n-slate-12"
            >
                <Icon icon={isHidden ? 'i-lucide-eye-off' : 'i-lucide-eye'} className="size-3.5" />
            </button>
        </div>
    );
}
