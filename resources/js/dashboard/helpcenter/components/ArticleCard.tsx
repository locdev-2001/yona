import { useMemo, useRef, useState } from 'react';

import { t } from '../../../i18n';
import { dynamicTime } from 'shared/helpers/timeHelper';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import Button from 'dashboard/components-next/button/Button';
import CardLayout from 'dashboard/components-next/CardLayout';
import Checkbox from 'dashboard/components-next/checkbox/Checkbox';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon';
import Icon from 'dashboard/components-next/icon/Icon';
import { useClickAway } from 'dashboard/composables/useClickAway';
import ArticlePendingChangesPopover from './ArticlePendingChangesPopover';
import type { PendingChangesPopoverHandle } from './ArticlePendingChangesPopover';
import { ARTICLE_MENU_ITEMS, ARTICLE_MENU_OPTIONS, ARTICLE_STATUSES, getArticleStatus } from '../helper/portalHelper';
import type { ArticleAuthor } from '../types';

// Port từ components-next/HelpCenter/ArticleCard/ArticleCard.vue.
// Chưa có bản dịch tự động (Captain — EE) nên mục `translate` luôn bị lọc bỏ.
export interface ArticleCardCategory {
    slug?: string;
    name?: string;
    icon?: string;
    icon_color?: string;
}

interface ArticleCardProps {
    id: number;
    title: string;
    status: string;
    author?: ArticleAuthor | null;
    category: ArticleCardCategory;
    views: number;
    updatedAt: number;
    isSelected?: boolean;
    hasPendingChanges?: boolean;
    selectable?: boolean;
    showSelectionControl?: boolean;
    portalSlug?: string;
    onOpenArticle?: (id: number) => void;
    onArticleAction?: (payload: { action: string; value: string | number; id: number }) => void;
    onToggleSelect?: (id: number) => void;
    onHover?: (isHovered: boolean) => void;
    onDraftResolved?: (status?: number) => void;
    onDraftFailed?: (error: unknown) => void;
}

export default function ArticleCard({
    id,
    title,
    status,
    author = null,
    category,
    views,
    updatedAt,
    isSelected = false,
    hasPendingChanges = false,
    selectable = false,
    showSelectionControl = false,
    portalSlug = '',
    onOpenArticle,
    onArticleAction,
    onToggleSelect,
    onHover,
    onDraftResolved,
    onDraftFailed,
}: ArticleCardProps) {
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pendingChangesPopoverRef = useRef<PendingChangesPopoverHandle>(null);

    useClickAway(dropdownRef, () => setShowActionsDropdown(false), showActionsDropdown);

    const articleMenuItems = useMemo<DropdownMenuItem[]>(() => {
        const statusItems = (ARTICLE_MENU_OPTIONS[status] || ARTICLE_MENU_OPTIONS[ARTICLE_STATUSES.PUBLISHED])
            .filter(key => key !== 'translate')
            .map(key => ({ ...ARTICLE_MENU_ITEMS[key], label: t(ARTICLE_MENU_ITEMS[key].label) }));

        const draftItems = hasPendingChanges
            ? [
                  {
                      label: t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.DISCARD_CHANGES'),
                      value: 'discard-draft',
                      action: 'discard-draft',
                      icon: 'i-lucide-undo-2',
                  },
              ]
            : [];

        return [
            ...statusItems,
            ...draftItems,
            { ...ARTICLE_MENU_ITEMS.delete, label: t(ARTICLE_MENU_ITEMS.delete.label) },
        ] as DropdownMenuItem[];
    }, [status, hasPendingChanges]);

    const statusTextColor =
        status === 'archived' ? 'text-n-slate-12' : status === 'draft' ? 'text-n-amber-11' : 'text-n-teal-11';

    const statusText =
        status === 'archived'
            ? t('HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.STATUS.ARCHIVED')
            : status === 'draft'
              ? t('HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.STATUS.DRAFT')
              : t('HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.STATUS.PUBLISHED');

    const categoryName = category?.slug
        ? category.name
        : t('HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.CATEGORY.UNCATEGORISED');

    const authorName = author?.name || author?.availableName || author?.available_name || '';

    const handleArticleAction = (item: DropdownMenuItem) => {
        setShowActionsDropdown(false);
        // Rời trạng thái đã đăng khi còn bản nháp — hỏi áp dụng hay bỏ trước.
        if (hasPendingChanges && (item.action === 'draft' || item.action === 'archive')) {
            pendingChangesPopoverRef.current?.open(getArticleStatus(String(item.value)));

            return;
        }
        onArticleAction?.({ action: item.action, value: item.value, id });
    };

    return (
        <CardLayout
            selectable={selectable}
            className="relative"
            onMouseEnter={() => onHover?.(true)}
            onMouseLeave={() => onHover?.(false)}
        >
                <div
                    className="absolute top-7 ltr:left-3 rtl:right-3"
                    style={{ display: showSelectionControl ? undefined : 'none' }}
                >
                    <Checkbox checked={isSelected} onChange={() => onToggleSelect?.(id)} />
                </div>
                <div className="flex justify-between w-full gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                        <span
                            className="text-base cursor-pointer hover:underline underline-offset-2 hover:text-n-blue-11 text-n-slate-12 line-clamp-1"
                            onClick={() => onOpenArticle?.(id)}
                        >
                            {title}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasPendingChanges ? (
                            <span
                                title={t('HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.PENDING_EDITS_TOOLTIP')}
                                className="text-xs font-medium inline-flex items-center gap-1 h-6 px-2 py-0.5 rounded-md text-n-slate-11 bg-n-alpha-2 whitespace-nowrap shrink-0"
                            >
                                <span className="rounded-full size-1.5 bg-n-amber-9 shrink-0" />
                                {t('HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.PENDING_EDITS')}
                            </span>
                        ) : null}
                        <span
                            className={`text-xs font-medium inline-flex items-center h-6 px-2 py-0.5 rounded-md bg-n-alpha-2 ${statusTextColor}`}
                        >
                            {statusText}
                        </span>
                        <div ref={dropdownRef} className="relative flex items-center group">
                            <Button
                                icon="i-lucide-ellipsis-vertical"
                                color="slate"
                                size="xs"
                                className="rounded-md group-hover:bg-n-alpha-2"
                                onClick={() => setShowActionsDropdown(open => !open)}
                            />
                            {showActionsDropdown ? (
                                <DropdownMenu
                                    menuItems={articleMenuItems}
                                    className="mt-1 end-0 top-full w-40"
                                    onAction={handleArticleAction}
                                />
                            ) : null}
                            <ArticlePendingChangesPopover
                                ref={pendingChangesPopoverRef}
                                articleId={id}
                                portalSlug={portalSlug}
                                onResolved={status => onDraftResolved?.(status)}
                                onFailed={error => onDraftFailed?.(error)}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
                    <div className="flex items-center min-w-0 gap-2 sm:gap-4">
                        <div className="flex items-center min-w-0 gap-1">
                            <Avatar seed={avatarSeed('user', author?.id)} name={authorName} src={author?.thumbnail} size={16} roundedFull />
                            <span className="text-sm truncate text-n-slate-11">{authorName || '-'}</span>
                        </div>
                        <span className="flex items-center min-w-0 gap-1 text-sm text-n-slate-11">
                            {category?.icon ? (
                                <EmojiIcon
                                    value={category.icon}
                                    color={category.icon_color}
                                    className="flex-shrink-0 size-4"
                                />
                            ) : null}
                            <span className="truncate">{categoryName}</span>
                        </span>
                        <div className="inline-flex items-center gap-1 text-n-slate-11 whitespace-nowrap shrink-0">
                            <Icon icon="i-lucide-eye" className="size-4" />
                            <span className="text-sm">
                                {t('HELP_CENTER.ARTICLES_PAGE.ARTICLE_CARD.CARD.VIEWS', { count: views })}
                            </span>
                        </div>
                    </div>
                    <span className="text-sm text-n-slate-11 line-clamp-1 shrink-0">{dynamicTime(updatedAt)}</span>
                </div>
        </CardLayout>
    );
}
