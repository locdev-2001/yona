import { DndContext, DragOverlay, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Loader from 'shared/components/loader/Loader';
import type { PinMoveDirection } from 'dashboard/components/widgets/conversation/conversationCardComponents/ConversationContextMenu';
import { useBulkSelection } from 'dashboard/composables/useBulkActions';
import { conversationUrl } from 'dashboard/helper/URLHelper';
import { ICONS } from 'dashboard/icons';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import { moveId } from '../lifecycleReducers';
import type { Conversation, ConversationMessage } from '../types';
import { useMarkUnreadAndLeave } from '../useMarkUnreadAndLeave';
import ConversationItem from './ConversationItem';
import type { ConversationItemActions } from './ConversationItem';
import { closestInsideGroup } from 'shared/reorder/closestInsideGroup';

// Kéo thả cả thẻ ghim, chỉ bằng chuột (MouseSensor): màn cảm
// ứng không kéo để khỏi tranh cuộn, đổi chỗ bằng mục Lên/Xuống trong menu thao tác.
// Phải rê quá ngưỡng mới thành kéo. Bản sao thẻ (DragOverlay, portal vào body) bay
// tự do theo con trỏ; dòng gốc đứng lại làm khoảng trống, chỉ các dòng ghim trượt.
const DRAG_ACTIVATION_DISTANCE = 6;
// Tự cuộn khi kéo sát mép chỉ theo trục dọc: cột danh sách không bao giờ cuộn ngang.
const VERTICAL_AUTO_SCROLL = { threshold: { x: 0, y: 0.2 } };

// Port từ dashboard/components/ConversationList.vue — bỏ Virtualizer (virtua):
// render list thường. Thẻ không có đường kẻ: tách nhau bằng khoảng cách, hover
// và đang chọn là nền bo góc. IntersectionObserver dùng API
// trực tiếp thay component; phím tắt j/k cắt (B3).
// `matched_message` (ô tìm): dòng xem trước là tin khớp, bấm thẻ nhảy tới tin đó.
type ListedConversation = Conversation & { matched_message?: ConversationMessage | null };

interface ConversationListProps {
    conversationList: ListedConversation[];
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
    const {
        accountId,
        listFilters,
        teamId,
        conversationId,
        searchQuery,
        markMessagesRead,
        setConversationPinned,
        focusMessage,
        reorderPinnedConversations,
    } = useConversation();
    const markUnreadAndLeave = useMarkUnreadAndLeave(conversationType);
    const bulkSelection = useBulkSelection();
    const isSelecting = bulkSelection?.isSelecting ?? false;
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE } }));

    // Danh sách xếp được luôn đưa nhóm ghim lên đầu (sortComparator), nên tách ra hai
    // phần giữ nguyên thứ tự của từng phần.
    const [pinnedConversations, otherConversations] = useMemo(
        () =>
            sortablePins
                ? [conversationList.filter(chat => chat.pinned), conversationList.filter(chat => !chat.pinned)]
                : [[], conversationList],
        [conversationList, sortablePins],
    );
    const pinnedIds = useMemo(() => pinnedConversations.map(chat => chat.id), [pinnedConversations]);
    // Mỗi tin realtime tạo mảng ghim mới; movePin đọc qua ref để thao tác của thẻ giữ nguyên tham chiếu.
    const pinnedIdsRef = useRef(pinnedIds);
    pinnedIdsRef.current = pinnedIds;

    const movePin = useCallback(
        (pinnedConversationId: number, direction: PinMoveDirection) => {
            const currentPinnedIds = pinnedIdsRef.current;
            const index = currentPinnedIds.indexOf(pinnedConversationId);
            const targetIndex = direction === 'top' ? 0 : direction === 'up' ? index - 1 : index + 1;
            void reorderPinnedConversations(moveId(currentPinnedIds, pinnedConversationId, targetIndex));
        },
        [reorderPinnedConversations],
    );

    // focusMessage đổi theo hội thoại đang mở; đọc qua ref để chuyển hội thoại không vẽ lại cả danh sách.
    const focusMessageRef = useRef(focusMessage);
    focusMessageRef.current = focusMessage;
    const focusMatchedMessage = useCallback((messageId: number) => focusMessageRef.current(messageId), []);

    const itemActions = useMemo<ConversationItemActions>(
        () => ({
            markMessagesRead,
            markUnreadAndLeave,
            setConversationPinned,
            focusMessage: focusMatchedMessage,
            movePin,
            selectConversation: bulkSelection?.selectConversation,
            deSelectConversation: bulkSelection?.deSelectConversation,
        }),
        [
            markMessagesRead,
            markUnreadAndLeave,
            setConversationPinned,
            focusMatchedMessage,
            movePin,
            bulkSelection?.selectConversation,
            bulkSelection?.deSelectConversation,
        ],
    );

    const renderItem = (chat: ListedConversation, pinIndex: number | null) => (
        <ConversationItem
            key={chat.id}
            source={chat}
            inbox={inboxes.find(item => item.id === chat.inbox_id)}
            conversationPath={conversationUrl({ accountId, filters: listFilters, teamId, conversationType, id: chat.id })}
            actions={itemActions}
            isActiveChat={conversationId === chat.id}
            isSelecting={isSelecting}
            isSelected={bulkSelection?.isConversationSelected(chat.id) ?? false}
            showAssignee={showAssignee}
            searchQuery={searchQuery}
            matchedMessage={chat.matched_message}
            isSortablePin={pinIndex !== null}
            canMovePinUp={pinIndex !== null && pinIndex > 0}
            canMovePinDown={pinIndex !== null && pinIndex < pinnedIds.length - 1}
        />
    );

    const [draggedId, setDraggedId] = useState<number | null>(null);
    const draggedConversation = pinnedConversations.find(chat => chat.id === draggedId) ?? null;
    const onDragStart = ({ active }: DragStartEvent) => setDraggedId(Number(active.id));
    const onDragCancel = () => setDraggedId(null);

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        setDraggedId(null);
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
        <div ref={conversationListRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] conversations-list">
            {header}
            <div className="flex flex-col gap-0.5 px-2">
                {pinnedConversations.length ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestInsideGroup}
                        autoScroll={VERTICAL_AUTO_SCROLL}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        onDragCancel={onDragCancel}
                        accessibility={{ screenReaderInstructions: { draggable: t('CONVERSATION.CARD_CONTEXT_MENU.DRAG_PIN_HINT') } }}
                    >
                        <SortableContext items={pinnedIds} strategy={verticalListSortingStrategy} disabled={isSelecting}>
                            <div data-pinned-group className="flex flex-col gap-0.5">
                                {pinnedConversations.map((chat, pinIndex) => (
                                    <SortablePinnedRow key={chat.id} conversationId={chat.id}>
                                        {renderItem(chat, pinIndex)}
                                    </SortablePinnedRow>
                                ))}
                            </div>
                        </SortableContext>
                        {createPortal(
                            <DragOverlay>
                                {draggedConversation ? (
                                    <div data-pin-drag-overlay className="overlay-surface rounded-lg cursor-grabbing">
                                        {renderItem(draggedConversation, null)}
                                    </div>
                                ) : null}
                            </DragOverlay>,
                            document.body,
                        )}
                    </DndContext>
                ) : null}
                {otherConversations.map(chat => renderItem(chat, null))}
            </div>
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
    const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
        id: conversationId,
    });

    // Kéo được cả thẻ; MouseSensor chỉ bắt đầu kéo khi rê quá ngưỡng nên bấm mở hội
    // thoại, chuột phải và chọn nhiều vẫn như thường. Tay nắm chỉ là dấu hiệu kéo được.
    return (
        <div
            ref={setNodeRef}
            data-pinned-row={conversationId}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={`group/pinned relative rounded-lg [@media(hover:hover)]:cursor-grab ${isDragging ? 'bg-n-slate-3 [&>*]:invisible' : ''}`}
            {...listeners}
        >
            {children}
            <span
                data-pin-drag-handle
                aria-hidden="true"
                className="pointer-events-none absolute top-3 left-1 h-4 w-3 hidden [@media(hover:hover)]:flex items-center justify-center text-n-slate-9 group-hover/pinned:text-n-slate-11"
            >
                <span className={`${ICONS.dragHandle} size-3`} />
            </span>
        </div>
    );
}
