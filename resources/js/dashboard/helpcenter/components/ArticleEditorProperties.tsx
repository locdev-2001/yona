import { useEffect, useRef, useState } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import InlineInput from 'dashboard/components-next/inline-input/InlineInput';
import TagInput from 'dashboard/components-next/taginput/TagInput';
import TextArea from 'dashboard/components-next/textarea/TextArea';
import type { Article } from '../types';

// Port từ components-next/HelpCenter/Pages/ArticleEditorPage/ArticleEditorProperties.vue.
const SAVE_DEBOUNCE_MS = 400;

interface ArticleEditorPropertiesProps {
    article: Partial<Article>;
    className?: string;
    onSaveArticle: (meta: { title: string; description: string; tags: string[] }) => void;
    onClose: () => void;
}

export default function ArticleEditorProperties({
    article,
    className = '',
    onSaveArticle,
    onClose,
}: ArticleEditorPropertiesProps) {
    const [title, setTitle] = useState(article.meta?.title ?? '');
    const [description, setDescription] = useState(article.meta?.description ?? '');
    const [tags, setTags] = useState<string[]>(article.meta?.tags ?? []);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onSaveArticle({ title, description, tags }), SAVE_DEBOUNCE_MS);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, description, tags]);

    return (
        <div
            className={`flex flex-col absolute w-[25rem] bg-n-alpha-3 outline outline-1 outline-n-container backdrop-blur-[100px] shadow-lg gap-6 rounded-xl p-6 ${className}`.trim()}
        >
            <div className="flex items-center justify-between">
                <h3>{t('HELP_CENTER.EDIT_ARTICLE_PAGE.ARTICLE_PROPERTIES.ARTICLE_PROPERTIES')}</h3>
                <Button
                    icon="i-lucide-x"
                    size="sm"
                    variant="ghost"
                    color="slate"
                    className="hover:text-n-slate-11"
                    onClick={onClose}
                />
            </div>
            <div className="flex flex-col gap-2">
                <div>
                    <div className="flex justify-between w-full gap-4 py-2">
                        <label className="text-sm font-medium whitespace-nowrap min-w-[6.25rem] text-n-slate-12">
                            {t('HELP_CENTER.EDIT_ARTICLE_PAGE.ARTICLE_PROPERTIES.META_DESCRIPTION')}
                        </label>
                        <TextArea
                            value={description}
                            onChange={setDescription}
                            placeholder={t(
                                'HELP_CENTER.EDIT_ARTICLE_PAGE.ARTICLE_PROPERTIES.META_DESCRIPTION_PLACEHOLDER',
                            )}
                            className="w-[13.75rem]"
                            customTextAreaWrapperClass="!p-0 !border-0 !rounded-none !bg-transparent transition-none"
                            customTextAreaClass="max-h-[9.375rem]"
                            autoHeight
                            minHeight="3rem"
                        />
                    </div>
                    <div className="flex justify-between w-full gap-2 py-2">
                        <InlineInput
                            value={title}
                            placeholder={t('HELP_CENTER.EDIT_ARTICLE_PAGE.ARTICLE_PROPERTIES.META_TITLE_PLACEHOLDER')}
                            label={t('HELP_CENTER.EDIT_ARTICLE_PAGE.ARTICLE_PROPERTIES.META_TITLE')}
                            customLabelClass="min-w-[7.5rem]"
                            onChange={event => setTitle(event.target.value)}
                        />
                    </div>
                    <div className="flex justify-between w-full gap-3 py-2">
                        <label className="text-sm font-medium whitespace-nowrap min-w-[7.5rem] text-n-slate-12">
                            {t('HELP_CENTER.EDIT_ARTICLE_PAGE.ARTICLE_PROPERTIES.META_TAGS')}
                        </label>
                        <TagInput
                            value={tags}
                            placeholder={t('HELP_CENTER.EDIT_ARTICLE_PAGE.ARTICLE_PROPERTIES.META_TAGS_PLACEHOLDER')}
                            className="w-[14rem]"
                            allowCreate
                            showDropdown={false}
                            onCreate={tag => setTags(current => [...current, tag])}
                            onRemove={index => setTags(current => current.filter((_, position) => position !== index))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
