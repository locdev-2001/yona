import { DndContext, MouseSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';

import { t } from '../../../i18n';
import Loader from 'shared/components/loader/Loader';
import type { PinMoveDirection } from 'dashboard/components/widgets/conversation/conversationCardComponents/ConversationContextMenu';
import { useBulkSelection } from 'dashboard/composables/useBulkActions';
import { ICONS } from 'dashboard/icons';
import { useConversation } from '../ConversationContext';
import { moveId } from '../lifecycleReducers';
import type { Conversation, ConversationMessage } from '../types';
import ConversationItem from './ConversationItem';

// Kéo thả bằng tay nắm ở mép trái thẻ ghim, chỉ bằng chuột (MouseSensor): màn cảm
// ứng không kéo để khỏi tranh cuộn, đổi chỗ bằng mục Lên/Xuống trong menu thao tác.
// Phải rê quá ngưỡng mới thành kéo.
const DRAG_ACTIVATION_DISTANCE = 6;

// Port từ dashboard/components/ConversationList.vue — bỏ Virtualizer (virtua):
// render list thường. Thẻ không có đường kẻ: tách nhau bằng khoảng cách, hover
// và đang chọn là nền bo góc. IntersectionObserver dùng API
// trực tiếp thay component; phím tắt j/k cắt (B3).
interface ConversationListProps {
    // `matched_message` (ô tìm): dòng xem trước là tin khớp, bấm thẻ nhảy tới tin đó.
    conversationList: (Conversation & { matched_message?: ConversationMessage | null })[];
    // Nội dung đứng trên các thẻ trong cùng vùng cuộn (mục Liên hệ của ô tìm).
    header?: ReactNode;
    isLoading?: boolean;
    showEndOfListMessage?: boolean;
    showAssignee?: boolean;
    conversationType?: string;
    // Danh sách xếp nhóm ghim lên đầu (không phải kết quả tìm): cho đổi thứ tự nhóm ghim.
    sortablePins?: boolean;
    onLoadMore: () => void;
}

export default function ConversationList({
    conversationList,
    isLoading = false,
    showEndOfListMessage = false,
    showAssignee = false,
    conversationType = '',
    header = null,
    sortablePins = false,
    onLoadMore,
}: ConversationListProps) {
    const { reorderPinnedConversations } = useConversation();
    const isSelecting = useBulkSelection()?.isSelecting ?? false;
    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE } }));

    const pinnedIds = useMemo(
        () => (sortablePins ? conversationList.filter(chat => chat.pinned).map(chat => chat.id) : []),
        [conversationList, sortablePins],
    );

    const movePin = useCallback(
        (conversationId: number, direction: PinMoveDirection) => {
            const index = pinnedIds.indexOf(conversationId);
            const targetIndex = direction === 'top' ? 0 : direction === 'up' ? index - 1 : index + 1;
            void reorderPinnedConversations(moveId(pinnedIds, conversationId, targetIndex));
        },
        [pinnedIds, reorderPinnedConversations],
    );

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;

        const targetIndex = pinnedIds.indexOf(Number(over.id));
        if (targetIndex === -1) return;

        void reorderPinnedConversations(moveId(pinnedIds, Number(active.id), targetIndex));
    };

    const conversationListRef = useRef<HTMLDivElement>(null);
    const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
    const onLoadMoreRef = useRef(onLoadMore);
    onLoadMoreRef.current = onLoadMore;

    const showLoadMoreSentinel = !isLoading && !showEndOfListMessage;

    useEffect(() => {
        const sentinel = loadMoreSentinelRef.current;
        if (!showLoadMoreSentinel || !sentinel) return undefined;

        const observer = new IntersectionObserver(
            entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    onLoadMoreRef.current();
                }
            },
            { root: conversationListRef.current, rootMargin: '100px 0px 100px 0px' },
        );
        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [showLoadMoreSentinel]);

    return (
        <div ref={conversationListRef} className="flex-1 min-h-0 overflow-y-auto conversations-list">
            {header}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
                accessibility={{ screenReaderInstructions: { draggable: t('CONVERSATION.CARD_CONTEXT_MENU.DRAG_PIN_HINT') } }}
            >
                <SortableContext items={pinnedIds} strategy={verticalListSortingStrategy} disabled={isSelecting}>
                    <div className="flex flex-col gap-0.5 px-2">
                        {conversationList.map(chat => {
                            const pinIndex = pinnedIds.indexOf(chat.id);
                            const item = (
                                <ConversationItem
                                    key={chat.id}
                                    source={chat}
                                    showAssignee={showAssignee}
                                    conversationType={conversationType}
                                    matchedMessage={chat.matched_message}
                                    pinMoves={
                                        pinIndex === -1
                                            ? null
                                            : {
                                                  canMoveUp: pinIndex > 0,
                                                  canMoveDown: pinIndex < pinnedIds.length - 1,
                                                  onMove: direction => movePin(chat.id, direction),
                                              }
                                    }
                                />
                            );

                            return pinIndex === -1 ? (
                                item
                            ) : (
                                <SortablePinnedRow key={chat.id} conversationId={chat.id}>
                                    {item}
                                </SortablePinnedRow>
                            );
                        })}
                    </div>
                </SortableContext>
            </DndContext>
            {isLoading ? (
                <div className="flex justify-center my-4">
                    <Loader className="text-n-brand" />
                </div>
            ) : showEndOfListMessage ? (
                <p className="p-4 text-center text-n-slate-11">{t('CHAT_LIST.EOF')}</p>
            ) : (
                <div ref={loadMoreSentinelRef} />
            )}
        </div>
    );
}

function SortablePinnedRow({ conversationId, children }: { conversationId: number; children: ReactNode }) {
    const { setNodeRef, setActivatorNodeRef, listeners, transform, transition, isDragging } = useSortable({
        id: conversationId,
    });

    return (
        <div
            ref={setNodeRef}
            data-pinned-row={conversationId}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={`group/pinned relative ${isDragging ? 'z-10 opacity-80' : ''}`}
        >
            {children}
            {/* Tay nắm nằm trong khoảng đệm trái của thẻ nên không đẩy lệch bố cục; nằm
                ngoài thẻ nên bấm vào không mở hội thoại. Màn cảm ứng không có. */}
            <span
                ref={setActivatorNodeRef}
                data-pin-drag-handle
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 w-3 hidden [@media(hover:hover)]:flex items-center justify-center text-n-slate-9 group-hover/pinned:text-n-slate-11 ${
                    isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                {...listeners}
            >
                <span className={`${ICONS.dragHandle} size-3`} />
            </span>
        </div>
    );
}
