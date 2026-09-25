import { useCallback, useEffect, useRef, useState } from 'react';

import Files from 'dashboard/components-next/SharedAttachments/Files';
import Media from 'dashboard/components-next/SharedAttachments/Media';
import Button from 'dashboard/components-next/button/Button';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import Tabs from 'dashboard/components/ui/Tabs';
import { useIsSmallScreen } from 'dashboard/composables/useViewportWidth';
import { shortTimestamp } from 'shared/helpers/timeHelper';

import { t } from '../../../../i18n';
import { fetchSharedAttachments, fetchSharedLinks } from '../../api';
import type { LinkMessage } from '../../api';
import { useConversation } from '../../ConversationContext';
import { setContactPanelOverlayOpen } from '../../contactPanelVisibility';
import { SHARED_CONTENT_TABS, linksOfMessages } from './sharedContentLinks';
import type { SharedContentTab } from './sharedContentLinks';

interface PagedItems<T> {
    items: T[];
    hasMore: boolean;
    loading: boolean;
    failed: boolean;
    loadMore: () => void;
}

// Máy chủ báo hoặc còn trang (hasMore) hoặc tổng số (totalCount).
type PageLoader<T> = (page: number) => Promise<{ items: T[]; hasMore?: boolean; totalCount?: number }>;

// Danh sách nạp từ máy chủ theo trang, bắt đầu lại khi đổi hội thoại hay loại.
function usePagedItems<T>(loadPage: PageLoader<T>): PagedItems<T> {
    const [items, setItems] = useState<T[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const loadedCountRef = useRef(0);
    loadedCountRef.current = items.length;

    useEffect(() => {
        setItems([]);
        setPage(1);
    }, [loadPage]);

    useEffect(() => {
        let cancelled = false;
        const loadedBefore = page === 1 ? 0 : loadedCountRef.current;
        setLoading(true);
        setFailed(false);

        loadPage(page)
            .then(result => {
                if (cancelled) return;
                setItems(current => (page === 1 ? result.items : [...current, ...result.items]));
                setHasMore(result.hasMore ?? loadedBefore + result.items.length < (result.totalCount ?? 0));
            })
            .catch(() => !cancelled && setFailed(true))
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [loadPage, page]);

    const loadMore = useCallback(() => setPage(current => current + 1), []);

    return { items, hasMore, loading, failed, loadMore };
}

function useSharedAttachments(kind: 'media' | 'files'): PagedItems<MessageAttachment> {
    const { accountId, conversationId } = useConversation();
    const loadPage = useCallback<PageLoader<MessageAttachment>>(
        page =>
            fetchSharedAttachments(accountId, conversationId, kind, page).then(result => ({
                items: result.attachments,
                totalCount: result.totalCount,
            })),
        [accountId, conversationId, kind],
    );

    return usePagedItems(loadPage);
}

function useSharedLinkMessages(): PagedItems<LinkMessage> {
    const { accountId, conversationId } = useConversation();
    const loadPage = useCallback<PageLoader<LinkMessage>>(
        page => fetchSharedLinks(accountId, conversationId, page).then(result => ({ items: result.messages, hasMore: result.hasMore })),
        [accountId, conversationId],
    );

    return usePagedItems(loadPage);
}

function PageFooter<T>({ list, isEmpty }: { list: PagedItems<T>; isEmpty: boolean }) {
    if (list.loading) {
        return (
            <div className="flex justify-center p-3">
                <Spinner className="size-5" />
            </div>
        );
    }

    if (list.failed) {
        return <p className="p-3 text-sm text-center text-n-ruby-11">{t('CONVERSATION_SIDEBAR.SHARED_FILES.LOAD_ERROR')}</p>;
    }

    if (isEmpty) {
        return <p className="p-3 text-sm text-center text-n-slate-11">{t('CONVERSATION_SIDEBAR.SHARED_FILES.EMPTY_TAB')}</p>;
    }

    return list.hasMore ? (
        <Button ghost slate sm className="self-center" label={t('CONVERSATION_SIDEBAR.SHARED_FILES.LOAD_MORE')} onClick={list.loadMore} />
    ) : null;
}

type JumpToMessage = (messageId: number | undefined) => void;

function MediaTab({ onJump }: { onJump: JumpToMessage }) {
    const list = useSharedAttachments('media');

    return (
        <div className="flex flex-col gap-3">
            <Media attachments={list.items} onSelect={attachment => onJump(attachment.message_id)} />
            <PageFooter list={list} isEmpty={!list.items.length} />
        </div>
    );
}

function FilesTab({ onJump }: { onJump: JumpToMessage }) {
    const list = useSharedAttachments('files');

    return (
        <div className="flex flex-col gap-3">
            <Files attachments={list.items} onSelect={attachment => onJump(attachment.message_id)} />
            <PageFooter list={list} isEmpty={!list.items.length} />
        </div>
    );
}

function LinksTab({ onJump }: { onJump: JumpToMessage }) {
    const list = useSharedLinkMessages();
    const links = linksOfMessages(list.items);

    return (
        <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-1">
                {links.map(link => (
                    <li key={link.key} className="flex items-center gap-2 rounded-lg hover:bg-n-alpha-2">
                        <button
                            type="button"
                            data-testid="shared-link"
                            className="flex flex-col items-start flex-1 min-w-0 gap-0.5 px-2 py-1.5 text-start"
                            onClick={() => onJump(link.messageId)}
                        >
                            <span className="w-full text-sm font-medium truncate text-n-slate-12">{link.domain}</span>
                            <span className="w-full text-xs truncate text-n-slate-11">{link.url}</span>
                            <span className="text-xs text-n-slate-10">{shortTimestamp(link.createdAt, true)}</span>
                        </button>
                        <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            title={t('CONVERSATION_SIDEBAR.SHARED_FILES.OPEN_LINK')}
                            className="flex-shrink-0 p-2 text-n-slate-11 hover:text-n-slate-12"
                        >
                            <span className="block i-lucide-external-link size-4" aria-hidden />
                        </a>
                    </li>
                ))}
            </ul>
            <PageFooter list={list} isEmpty={!links.length} />
        </div>
    );
}

const TAB_LABEL_KEYS: Record<SharedContentTab, string> = {
    media: 'CONVERSATION_SIDEBAR.SHARED_FILES.TAB_MEDIA',
    files: 'CONVERSATION_SIDEBAR.SHARED_FILES.TAB_FILES',
    links: 'CONVERSATION_SIDEBAR.SHARED_FILES.TAB_LINKS',
};

export function SharedContentTabs({ onJumped }: { onJumped?: () => void }) {
    const { focusMessage } = useConversation();
    const [activeIndex, setActiveIndex] = useState(0);
    const activeTab = SHARED_CONTENT_TABS[activeIndex];

    const onJump: JumpToMessage = messageId => {
        if (!messageId) return;
        onJumped?.();
        void focusMessage(messageId);
    };

    return (
        <div className="flex flex-col gap-3">
            <Tabs
                items={SHARED_CONTENT_TABS.map(tab => ({ key: tab, name: t(TAB_LABEL_KEYS[tab]) }))}
                index={activeIndex}
                isCompact
                onChange={setActiveIndex}
            />
            <div data-testid={`shared-content-${activeTab}`}>
                {activeTab === 'media' ? <MediaTab onJump={onJump} /> : null}
                {activeTab === 'files' ? <FilesTab onJump={onJump} /> : null}
                {activeTab === 'links' ? <LinksTab onJump={onJump} /> : null}
            </div>
        </div>
    );
}

// Mục "Ảnh/video · Tệp · Liên kết" ở panel phải. Điện thoại mở thành màn riêng;
// bấm một mục thì đóng màn đó và panel để thấy tin được nhảy tới.
export default function SharedContent() {
    const isSmallScreen = useIsSmallScreen();
    const [isScreenOpen, setScreenOpen] = useState(false);

    if (!isSmallScreen) {
        return (
            <div className="p-2">
                <SharedContentTabs />
            </div>
        );
    }

    const closeAfterJump = () => {
        setScreenOpen(false);
        setContactPanelOverlayOpen(false);
    };

    return (
        <div className="p-2">
            <Button
                ghost
                slate
                sm
                className="w-full !justify-between"
                label={t('CONVERSATION_SIDEBAR.SHARED_FILES.OPEN_SCREEN')}
                trailingIcon
                icon="i-lucide-chevron-right"
                onClick={() => setScreenOpen(true)}
            />
            {isScreenOpen ? (
                <div data-testid="shared-content-screen" className="fixed inset-0 z-50 flex flex-col bg-n-background">
                    <header className="flex items-center gap-2 px-2 border-b h-12 border-n-weak">
                        <Button
                            ghost
                            slate
                            sm
                            icon="i-lucide-arrow-left"
                            title={t('CONVERSATION_SIDEBAR.SHARED_FILES.BACK')}
                            onClick={() => setScreenOpen(false)}
                        />
                        <h2 className="text-sm font-medium truncate text-n-slate-12">
                            {t('CONVERSATION_SIDEBAR.ACCORDION.SHARED_FILES')}
                        </h2>
                    </header>
                    <div className="flex-1 min-h-0 p-3 overflow-y-auto">
                        <SharedContentTabs onJumped={closeAfterJump} />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
