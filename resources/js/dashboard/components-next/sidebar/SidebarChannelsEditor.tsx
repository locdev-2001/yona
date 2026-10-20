import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import type { ArrangedChannel } from './useChannelPreferences';

// Ngưỡng rê trước khi bắt đầu kéo: chạm vào tay nắm trên điện thoại không bị hiểu nhầm là kéo.
const DRAG_ACTIVATION_DISTANCE = 4;

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

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        onReorder(arrayMove(inboxIds, inboxIds.indexOf(Number(active.id)), inboxIds.indexOf(Number(over.id))));
    };

    return (
        <div className="ms-3 flex flex-col gap-0.5 py-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={inboxIds} strategy={verticalListSortingStrategy}>
                    {channels.map(channel => (
                        <ChannelEditorRow
                            key={channel.inbox.id}
                            channel={channel}
                            onToggleHidden={onToggleHidden}
                            onRename={onRename}
                        />
                    ))}
                </SortableContext>
            </DndContext>
            <Button solid sm className="mt-1" label={t('SIDEBAR.CHANNEL_PREFERENCES.DONE')} onClick={onDone} />
        </div>
    );
}

function ChannelEditorRow({
    channel,
    onToggleHidden,
    onRename,
}: {
    channel: ArrangedChannel;
    onToggleHidden: (inboxId: number) => void;
    onRename: (inboxId: number, alias: string) => void;
}) {
    const { inbox, label, isHidden } = channel;
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: inbox.id });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={`flex h-8 min-w-0 items-center gap-1 rounded-lg pe-1 ${
                isDragging ? 'relative z-10 bg-n-surface-selected shadow-sm' : 'hover:bg-n-surface-hover'
            }`}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                aria-label={t('SIDEBAR.CHANNEL_PREFERENCES.DRAG')}
                title={t('SIDEBAR.CHANNEL_PREFERENCES.DRAG')}
                className="grid size-6 shrink-0 cursor-grab touch-none place-content-center rounded-md text-n-slate-10 active:cursor-grabbing"
            >
                <Icon icon="i-lucide-grip-vertical" className="size-3.5" />
            </button>
            <span className={`grid size-4 shrink-0 place-content-center ${isHidden ? 'opacity-40' : ''}`}>
                <ChannelIcon inbox={inbox} className="size-4" />
            </span>
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
                className={`h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-sm hover:border-n-weak focus:border-n-brand focus:outline-none ${
                    isHidden ? 'text-n-slate-9 line-through' : 'text-n-slate-12'
                }`}
            />
            <button
                type="button"
                onClick={() => onToggleHidden(inbox.id)}
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
