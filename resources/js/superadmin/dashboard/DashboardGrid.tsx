import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { Announcements, DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMemo } from 'react';

import { t } from '../../i18n';
import { DashboardWidget } from './DashboardWidget';
import { GRID_CLASS, moveItem } from './layout';
import type { LayoutItem, OperationLink, RangePreset, WidgetMeta, WidgetSize } from './types';

type Props = {
    items: LayoutItem[];
    widgets: Record<string, WidgetMeta>;
    editing: boolean;
    sizes: WidgetSize[];
    range: RangePreset;
    endpoint: string;
    links: OperationLink[];
    onChange: (layout: LayoutItem[]) => void;
    onResize: (key: string, size: WidgetSize) => void;
    onHide: (key: string) => void;
};

const POINTER_ACTIVATION_DISTANCE = 6;

export function DashboardGrid({ items, widgets, editing, sizes, range, endpoint, links, onChange, onResize, onHide }: Props) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: POINTER_ACTIVATION_DISTANCE } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const announcements = useMemo<Announcements>(() => {
        const title = (id: UniqueIdentifier) => widgets[String(id)]?.title ?? String(id);
        const position = (id: UniqueIdentifier | undefined) => items.findIndex(item => item.key === id) + 1;

        return {
            onDragStart: ({ active }) => t('ADMIN_DASHBOARD.EDIT.PICKED_UP', { title: title(active.id) }),
            onDragOver: ({ active, over }) =>
                over ? t('ADMIN_DASHBOARD.EDIT.MOVED_OVER', { title: title(active.id), position: position(over.id) }) : undefined,
            onDragEnd: ({ active, over }) =>
                over ? t('ADMIN_DASHBOARD.EDIT.DROPPED', { title: title(active.id), position: position(over.id) }) : undefined,
            onDragCancel: ({ active }) => t('ADMIN_DASHBOARD.EDIT.CANCELLED', { title: title(active.id) }),
        };
    }, [items, widgets]);

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (over && active.id !== over.id) {
            onChange(moveItem(items, String(active.id), String(over.id)));
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
            accessibility={{ announcements, screenReaderInstructions: { draggable: t('ADMIN_DASHBOARD.EDIT.HINT') } }}
        >
            <SortableContext items={items.map(item => item.key)} strategy={rectSortingStrategy} disabled={!editing}>
                <div className={GRID_CLASS}>
                    {items.map(item => (
                        <SortableWidget
                            key={item.key}
                            item={item}
                            meta={widgets[item.key]}
                            editing={editing}
                            sizes={sizes}
                            range={range}
                            endpoint={endpoint}
                            links={links}
                            onResize={size => onResize(item.key, size)}
                            onHide={() => onHide(item.key)}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

function SortableWidget({
    item,
    meta,
    editing,
    sizes,
    range,
    endpoint,
    links,
    onResize,
    onHide,
}: {
    item: LayoutItem;
    meta: WidgetMeta;
    editing: boolean;
    sizes: WidgetSize[];
    range: RangePreset;
    endpoint: string;
    links: OperationLink[];
    onResize: (size: WidgetSize) => void;
    onHide: () => void;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: item.key,
        disabled: !editing,
    });

    return (
        <DashboardWidget
            ref={setNodeRef}
            meta={meta}
            item={item}
            range={range}
            endpoint={endpoint}
            links={links}
            dragging={isDragging}
            onHide={onHide}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            edit={
                editing
                    ? {
                          sizes,
                          onResize,
                          onHide,
                          handleRef: setActivatorNodeRef,
                          handleProps: { ...attributes, ...listeners },
                      }
                    : null
            }
        />
    );
}
