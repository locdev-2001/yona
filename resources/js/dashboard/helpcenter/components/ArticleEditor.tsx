import { useEffect, useRef, useState } from 'react';

import { t } from '../../../i18n';
import { ARTICLE_EDITOR_MENU_OPTIONS } from 'dashboard/constants/editor';
import FullEditor from 'dashboard/components/widgets/WootWriter/FullEditor';
import TextArea from 'dashboard/components-next/textarea/TextArea';
import ArticleDiffPanel from './ArticleDiffPanel';
import type { DiffPanelHandle } from './ArticleDiffPanel';
import ArticleEditorControls from './ArticleEditorControls';
import ArticleEditorHeader from './ArticleEditorHeader';
import HelpCenterLayout from './HelpCenterLayout';
import type { Article } from '../types';

// Port từ components-next/HelpCenter/Pages/ArticleEditorPage/ArticleEditor.vue.
const AUTOSAVE_DELAY_MS = 500;

interface ArticleEditorProps {
    article: Partial<Article>;
    portalSlug: string;
    categorySlug?: string;
    isUpdating?: boolean;
    isSaved?: boolean;
    onSaveArticle: (values: Record<string, unknown>) => void;
    onCreateArticle?: (values: { title: string; content: string }) => void;
    onGoBack: () => void;
    onPreviewArticle?: () => void;
    onSetAuthor?: (authorId: number) => void;
    onSetCategory?: (categoryId: number) => void;
}

export default function ArticleEditor({
    article,
    portalSlug,
    categorySlug,
    isUpdating = false,
    isSaved = false,
    onSaveArticle,
    onCreateArticle,
    onGoBack,
    onPreviewArticle,
    onSetAuthor,
    onSetCategory,
}: ArticleEditorProps) {
    const isNewArticle = !article?.id;

    // Ưu tiên bản nháp; `??` giữ chuỗi rỗng do người dùng cố ý xoá.
    const effectiveTitle = () => article?.draftTitle ?? article?.title ?? '';
    const effectiveContent = () => article?.draftContent ?? article?.content ?? '';

    const hasPendingChanges = article?.draftTitle != null || article?.draftContent != null;

    const [localTitle, setLocalTitle] = useState(effectiveTitle);
    const [localContent, setLocalContent] = useState(effectiveContent);
    const [isSaving, setSaving] = useState(false);
    const diffPanelRef = useRef<DiffPanelHandle>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const latestRef = useRef({ title: localTitle, content: localContent, isNewArticle, onSaveArticle });
    latestRef.current = { title: localTitle, content: localContent, isNewArticle, onSaveArticle };
    const previousRef = useRef({ id: article?.id, pending: hasPendingChanges });

    // Nạp lại khi đổi bài hoặc khi bản nháp vừa được đăng/bỏ; trường hợp sau
    // đóng luôn bảng so sánh vì không còn gì để so.
    useEffect(() => {
        const previous = previousRef.current;
        const draftResolved = previous.pending && !hasPendingChanges;

        if ((article?.id && article.id !== previous.id) || draftResolved) {
            clearTimeout(timerRef.current);
            setSaving(false);
            setLocalTitle(effectiveTitle());
            setLocalContent(effectiveContent());
        }
        if (draftResolved) diffPanelRef.current?.close();

        previousRef.current = { id: article?.id, pending: hasPendingChanges };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [article?.id, hasPendingChanges]);

    // Tự lưu 500ms sau lần gõ cuối; gửi cả tiêu đề lẫn nội dung để sửa bên này
    // không làm mất sửa vừa xong bên kia.
    const scheduleSave = (title: string, content: string) => {
        if (isNewArticle) return;

        clearTimeout(timerRef.current);
        setSaving(true);
        timerRef.current = setTimeout(() => {
            setSaving(false);
            onSaveArticle({ title, content });
        }, AUTOSAVE_DELAY_MS);
    };

    // Rời trang khi còn hàng đợi: gửi nốt để không mất lần sửa cuối.
    useEffect(
        () => () => {
            if (latestRef.current.isNewArticle) return;
            clearTimeout(timerRef.current);
        },
        [],
    );

    return (
        <HelpCenterLayout
            showHeaderTitle={false}
            showPaginationFooter={false}
            portalSlug={portalSlug}
            headerActions={
                <>
                    <ArticleEditorHeader
                        isUpdating={isUpdating}
                        isSaved={isSaved}
                        status={article.status}
                        articleId={article.id ?? 0}
                        portalSlug={portalSlug}
                        pendingChanges={hasPendingChanges}
                        isSaving={isSaving}
                        onGoBack={onGoBack}
                        onPreviewArticle={() => onPreviewArticle?.()}
                        onShowDiff={() => diffPanelRef.current?.open()}
                    />
                    <ArticleDiffPanel ref={diffPanelRef} article={article} />
                </>
            }
            content={
                <>
                    <div
                        className="flex flex-col gap-3 pl-4 mb-3 rtl:pr-3 rtl:pl-0"
                        onBlur={event => {
                            // handleCreateArticle gốc: rời ô tiêu đề ở bài mới thì tạo bài.
                            const target = event.target as unknown as HTMLElement;
                            if (!isNewArticle || target.tagName !== 'TEXTAREA') return;
                            const title = (target as HTMLTextAreaElement).value || '';
                            if (title.trim()) onCreateArticle?.({ title, content: localContent });
                        }}
                    >
                        <TextArea
                            value={localTitle}
                            onChange={value => {
                                setLocalTitle(value);
                                scheduleSave(value, localContent);
                            }}
                            autoHeight
                            minHeight="4rem"
                            customTextAreaClass="!text-[32px] !leading-[48px] !font-medium !tracking-[0.2px]"
                            customTextAreaWrapperClass="border-0 !bg-transparent dark:!bg-transparent !py-0 !px-0"
                            placeholder="Title"
                            autofocus={isNewArticle}
                        />
                        <ArticleEditorControls
                            article={article}
                            categorySlug={categorySlug}
                            onSaveArticle={onSaveArticle}
                            onSetAuthor={authorId => onSetAuthor?.(authorId)}
                            onSetCategory={categoryId => onSetCategory?.(categoryId)}
                        />
                    </div>
                    <FullEditor
                        value={localContent}
                        className="py-0 pb-10 pl-4 rtl:pr-4 rtl:pl-0 h-fit"
                        placeholder={t('HELP_CENTER.EDIT_ARTICLE_PAGE.EDIT_ARTICLE.EDITOR_PLACEHOLDER')}
                        enabledMenuOptions={ARTICLE_EDITOR_MENU_OPTIONS}
                        autofocus={!isNewArticle}
                        onChange={value => {
                            setLocalContent(value);
                            scheduleSave(localTitle, value);
                        }}
                    />
                </>
            }
        />
    );
}
