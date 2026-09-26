import { forwardRef, useImperativeHandle, useState } from 'react';

import { t } from '../../../i18n';
import MessageFormatter from 'shared/helpers/MessageFormatter';
import SidePanel from 'dashboard/components-next/side-panel/SidePanel';
import { buildDiffBlocks, renderInlineDiff } from '../helper/articleDiffHelper';
import type { Article } from '../types';

// Port từ components-next/HelpCenter/Pages/ArticleEditorPage/ArticleDiffPanel.vue.
export interface DiffPanelHandle {
    open: () => void;
    close: () => void;
}

// Bảng của help center lưu bề rộng từng cột (px, 0 = chưa đặt) trong dấu này;
// formatter bỏ nó đi nên phải dựng lại thành <colgroup> layout cố định.
const COLWIDTHS_RE = /<!--cw-colwidths:([\d,]+)-->/;
const DEFAULT_COL_WIDTH = 50;

function applyColumnWidths(html: string, widths: number[]): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = doc.body.querySelector('table');
    if (!table) return html;

    const sized = widths.map(width => (width > 0 ? width : DEFAULT_COL_WIDTH));
    const colgroup = doc.createElement('colgroup');
    sized.forEach(width => {
        const col = doc.createElement('col');
        col.style.width = `${width}px`;
        colgroup.appendChild(col);
    });
    table.insertBefore(colgroup, table.firstChild);

    table.style.tableLayout = 'fixed';
    table.style.width = `${sized.reduce((sum, width) => sum + width, 0)}px`;

    return doc.body.innerHTML;
}

function renderMarkdown(markdown: string): string {
    if (!markdown) return '';

    const html = new MessageFormatter(markdown).formattedMessage;
    const match = markdown.match(COLWIDTHS_RE);

    return match ? applyColumnWidths(html, match[1].split(',').map(Number)) : html;
}

const blockClass = (type: string): string => {
    if (type === 'added') return 'border-n-teal-9 bg-n-teal-2';
    if (type === 'removed') return 'border-n-ruby-9 bg-n-ruby-2 line-through decoration-n-ruby-9/50';

    return 'border-transparent';
};

const ArticleDiffPanel = forwardRef<DiffPanelHandle, { article: Partial<Article> }>(function ArticleDiffPanel(
    { article },
    ref,
) {
    const [open, setOpen] = useState(false);

    useImperativeHandle(ref, () => ({ open: () => setOpen(true), close: () => setOpen(false) }));

    const liveTitle = article?.title ?? '';
    const liveContent = article?.content ?? '';
    const draftTitle = article?.draftTitle ?? liveTitle;
    const draftContent = article?.draftContent ?? liveContent;

    const titleChanged = liveTitle !== draftTitle;
    const contentBlocks = buildDiffBlocks(liveContent, draftContent);
    const contentChanged = contentBlocks.some(block => block.type !== 'equal');

    return (
        <SidePanel
            open={open}
            width="lg"
            title={t('HELP_CENTER.EDIT_ARTICLE_PAGE.DIFF_DIALOG.TITLE')}
            onClose={() => setOpen(false)}
            header={
                <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-n-amber-9 shrink-0" />
                        <h3 className="text-base font-medium leading-6 text-n-slate-12">
                            {t('HELP_CENTER.EDIT_ARTICLE_PAGE.DIFF_DIALOG.TITLE')}
                        </h3>
                    </div>
                    <p className="text-sm text-n-slate-11">
                        {t('HELP_CENTER.EDIT_ARTICLE_PAGE.DIFF_DIALOG.DESCRIPTION')}
                    </p>
                </div>
            }
        >
            <div className="flex flex-col gap-4">
                {titleChanged ? (
                    <div className="flex flex-col gap-1.5 border-s-[3px] border-transparent ps-3">
                        <span className="text-[11px] font-medium tracking-wide uppercase text-n-slate-10">
                            {t('HELP_CENTER.EDIT_ARTICLE_PAGE.DIFF_DIALOG.TITLE_LABEL')}
                        </span>
                        <h1
                            className="text-lg font-semibold leading-snug text-n-slate-12"
                            dangerouslySetInnerHTML={{ __html: renderInlineDiff(liveTitle, draftTitle) }}
                        />
                    </div>
                ) : null}

                {contentChanged ? (
                    <div className="flex flex-col gap-1 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:border-n-weak [&_td]:border-n-weak [&_th]:p-2 [&_td]:p-2 [&_th]:bg-n-alpha-1 [&_th]:text-start [&_td]:align-top">
                        {contentBlocks.map((block, index) => (
                            <div
                                key={index}
                                className={`px-3 py-1.5 overflow-x-auto text-sm leading-relaxed break-words border-s-[3px] rounded-e-md text-n-slate-12 prose-sm prose max-w-none [&_p]:my-0 [&>:first-child]:mt-0 [&>:last-child]:mb-0 ${blockClass(block.type)}`}
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(block.md) }}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        </SidePanel>
    );
});

export default ArticleDiffPanel;
