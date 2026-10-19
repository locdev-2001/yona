import { useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon';
import { getJson } from 'dashboard/helper/apiClient';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import ArticleEditorProperties from './ArticleEditorProperties';
import { useHelpCenterState } from '../store';
import type { Article, Category } from '../types';

interface ArticleAgent {
    id: number;
    name: string;
    available_name?: string;
    thumbnail?: string;
}
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/ArticleEditorPage/ArticleEditorControls.vue.
interface ArticleEditorControlsProps {
    article: Partial<Article>;
    categorySlug?: string;
    onSaveArticle: (values: Record<string, unknown>) => void;
    onSetAuthor: (authorId: number) => void;
    onSetCategory: (categoryId: number) => void;
}

export default function ArticleEditorControls({
    article,
    categorySlug,
    onSaveArticle,
    onSetAuthor,
    onSetCategory,
}: ArticleEditorControlsProps) {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const currentUserId = auth.user?.id;
    const { categories } = useHelpCenterState();
    const [agents, setAgents] = useState<ArticleAgent[]>([]);

    // Tương đương `agents/get` của store gốc: danh sách agent của tài khoản.
    useEffect(() => {
        void getJson<ArticleAgent[]>(`/api/v1/accounts/${currentAccount.id}/agents`).then(setAgents);
    }, [currentAccount.id]);

    const [openAgentsList, setOpenAgentsList] = useState(false);
    const [openCategoryList, setOpenCategoryList] = useState(false);
    const [openProperties, setOpenProperties] = useState(false);
    const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

    const agentsRef = useRef<HTMLDivElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);
    const propertiesRef = useRef<HTMLDivElement>(null);
    useClickAway(agentsRef, () => setOpenAgentsList(false), openAgentsList);
    useClickAway(categoryRef, () => setOpenCategoryList(false), openCategoryList);
    useClickAway(propertiesRef, () => setOpenProperties(false), openProperties);

    const isNewArticle = !article?.id;
    const currentUser = agents.find(agent => agent.id === currentUserId);

    const findCategoryFromSlug = (slug?: string) => categories.find(category => category.slug === slug);

    const author = isNewArticle
        ? selectedAuthorId
            ? agents.find(agent => agent.id === selectedAuthorId)
            : currentUser
        : article?.author;

    const authorName = author?.name || (author as { available_name?: string })?.available_name || '';

    const selectedCategory: Category | undefined = isNewArticle
        ? selectedCategoryId
            ? categories.find(category => category.id === selectedCategoryId)
            : (findCategoryFromSlug(categorySlug) ?? categories[0])
        : categories.find(category => category.id === article?.category?.id);

    const agentList = useMemo<DropdownMenuItem[]>(
        () =>
            agents
                .map(({ name, id, thumbnail }) => ({
                    label: name,
                    value: id,
                    thumbnail: { name, src: thumbnail ?? '', seed: avatarSeed('user', id) },
                    isSelected: article?.author?.id
                        ? id === article.author.id
                        : id === (selectedAuthorId || currentUserId),
                    action: 'assignAuthor',
                }))
                .sort((a, b) =>
                    a.isSelected !== b.isSelected
                        ? Number(b.isSelected) - Number(a.isSelected)
                        : a.label.localeCompare(b.label),
                ),
        [agents, article?.author?.id, selectedAuthorId, currentUserId],
    );

    const categoryList = useMemo<DropdownMenuItem[]>(
        () =>
            categories
                .map(({ name, id, icon, icon_color: iconColor }) => ({
                    label: name,
                    value: id,
                    emoji: icon,
                    iconColor,
                    isSelected: isNewArticle
                        ? id === (selectedCategoryId || selectedCategory?.id)
                        : id === article?.category?.id,
                    action: 'assignCategory',
                }))
                .sort((a, b) => Number(b.isSelected) - Number(a.isSelected)),
        [categories, isNewArticle, selectedCategoryId, selectedCategory?.id, article?.category?.id],
    );

    const handleArticleAction = (action: string, value: number) => {
        if (action === 'assignAuthor') {
            if (isNewArticle) {
                setSelectedAuthorId(value);
                onSetAuthor(value);
            } else {
                onSaveArticle({ author_id: value });
            }
            setOpenAgentsList(false);
        }
        if (action === 'assignCategory') {
            if (isNewArticle) {
                setSelectedCategoryId(value);
                onSetCategory(value);
            } else {
                onSaveArticle({ category_id: value });
            }
            setOpenCategoryList(false);
        }
    };

    // Bài mới mở từ một danh mục: gán sẵn danh mục đó.
    useEffect(() => {
        if (!categorySlug || !isNewArticle) return;

        const categoryFromSlug = findCategoryFromSlug(categorySlug);
        if (categoryFromSlug) handleArticleAction('assignCategory', categoryFromSlug.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categorySlug, categories.length]);

    return (
        <div className="flex items-center gap-4">
            <div className="relative flex items-center gap-2">
                <div ref={agentsRef}>
                    <Button
                        variant="ghost"
                        color="slate"
                        className="!px-0 font-normal hover:!bg-transparent"
                        onClick={() => setOpenAgentsList(open => !open)}
                    >
                        <Avatar seed={avatarSeed('user', author?.id)} name={authorName} src={author?.thumbnail} size={20} roundedFull />
                        <span className="text-sm text-n-slate-12 hover:text-n-slate-11">{authorName || '-'}</span>
                    </Button>
                    {openAgentsList && agents.length > 1 ? (
                        <DropdownMenu
                            menuItems={agentList}
                            showSearch
                            className="z-[100] w-48 mt-2 ltr:left-0 rtl:right-0 top-full max-h-60"
                            onAction={item => handleArticleAction(item.action, Number(item.value))}
                        />
                    ) : null}
                </div>
            </div>
            <div className="w-px h-3 bg-n-weak" />
            <div className="relative">
                <div ref={categoryRef}>
                    <Button
                        icon={!selectedCategory?.icon ? 'i-lucide-shapes' : ''}
                        variant="ghost"
                        color="slate"
                        className="!px-2 font-normal hover:!bg-transparent"
                        onClick={() => setOpenCategoryList(open => !open)}
                    >
                        <span className="flex items-center gap-1.5 min-w-0 text-sm text-n-slate-12 hover:text-n-slate-11">
                            {selectedCategory?.icon ? (
                                <EmojiIcon
                                    value={selectedCategory.icon}
                                    color={selectedCategory.icon_color}
                                    className="flex-shrink-0 size-4"
                                />
                            ) : null}
                            <span className="truncate">
                                {selectedCategory?.name ||
                                    t('HELP_CENTER.EDIT_ARTICLE_PAGE.EDIT_ARTICLE.UNCATEGORIZED')}
                            </span>
                        </span>
                    </Button>
                    {openCategoryList && categoryList.length ? (
                        <DropdownMenu
                            menuItems={categoryList}
                            showSearch
                            className="w-48 mt-2 z-[100] left-0 top-full max-h-60"
                            onAction={item => handleArticleAction(item.action, Number(item.value))}
                        />
                    ) : null}
                </div>
            </div>

            <div className="w-px h-3 bg-n-weak" />
            <div className="relative">
                <div ref={propertiesRef}>
                    <Button
                        label={t('HELP_CENTER.EDIT_ARTICLE_PAGE.EDIT_ARTICLE.MORE_PROPERTIES')}
                        icon="i-lucide-plus"
                        variant="ghost"
                        color="slate"
                        disabled={isNewArticle}
                        className="!px-2 font-normal hover:!bg-transparent hover:!text-n-slate-11"
                        onClick={() => setOpenProperties(open => !open)}
                    />
                    {openProperties ? (
                        <ArticleEditorProperties
                            article={article}
                            className="right-0 z-[100] mt-2 xl:left-0 top-full"
                            onSaveArticle={meta => onSaveArticle({ meta })}
                            onClose={() => setOpenProperties(false)}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
