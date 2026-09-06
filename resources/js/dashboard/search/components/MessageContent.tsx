import type { MouseEvent } from 'react';

import { t } from '../../../i18n';
import { getPlainText } from 'shared/helpers/MessageFormatter';
import { useExpandableContent } from '../useExpandableContent';
import type { SearchMessage } from '../types';

// Port từ dashboard/modules/search/components/MessageContent.vue.
interface MessageContentProps {
    author?: string;
    message: SearchMessage;
    searchTerm?: string;
}

function escapeHtml(html: string): string {
    const wrapper = document.createElement('p');
    wrapper.textContent = html;

    return wrapper.innerHTML;
}

// Tìm trên nội dung, tiêu đề email, hoặc lời thoại của tệp âm thanh.
function resolveContent(message: SearchMessage): string {
    if (message.content) return message.content;

    const subject = message.contentAttributes?.email?.subject;
    if (subject) return subject;

    // Lời thoại (transcribed_text) là tính năng EE, payload đính kèm chưa có.
    return '';
}

export default function MessageContent({ author = '', message, searchTerm = '' }: MessageContentProps) {
    const { contentElement, showReadMore, showReadLess, toggleExpanded } = useExpandableContent();

    // getPlainText giải markdown thành chữ thuần, escapeHtml mã hoá nó — nhờ đó
    // <span> tô sáng bên dưới là thẻ thật duy nhất trong chuỗi.
    const escapedText = escapeHtml(getPlainText(resolveContent(message)));
    const highlightedContent = searchTerm
        ? escapedText.replace(
              new RegExp(`(${escapeHtml(searchTerm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'),
              '<span class="searchkey--highlight">$1</span>',
          )
        : escapedText;

    const authorText = author ? `${author} ${t('SEARCH.WROTE')} ` : '';

    const toggle = (expanded: boolean) => (event: MouseEvent) => {
        event.preventDefault();
        toggleExpanded(expanded);
    };

    return (
        <div
            ref={contentElement}
            className={`break-words grid items-center text-n-slate-11 text-sm leading-relaxed ${
                showReadMore ? 'grid-cols-[1fr_auto]' : 'grid-cols-1'
            }`}
        >
            <div className={`min-w-0 ${showReadMore ? 'overflow-hidden whitespace-nowrap text-ellipsis' : ''}`}>
                {authorText ? <span className="text-n-slate-11 font-medium leading-4">{authorText}</span> : null}
                <span
                    className="message-content [&_p]:inline [&_p]:m-0 [&_br]:hidden text-n-slate-12 [&_.searchkey--highlight]:text-n-slate-12 [&_.searchkey--highlight]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: highlightedContent }}
                />
                {showReadLess ? (
                    <button
                        type="button"
                        className="text-sm text-n-slate-11 underline cursor-pointer bg-transparent border-0 p-0 hover:text-n-slate-12 font-medium ltr:ml-0.5 rtl:mr-0.5"
                        onClick={toggle(false)}
                    >
                        {t('SEARCH.READ_LESS')}
                    </button>
                ) : null}
            </div>
            {showReadMore ? (
                <button
                    type="button"
                    className="text-sm text-n-slate-11 underline cursor-pointer bg-transparent border-0 p-0 hover:text-n-slate-12 font-medium justify-self-end ltr:ml-0.5 rtl:mr-0.5"
                    onClick={toggle(true)}
                >
                    {t('SEARCH.READ_MORE')}
                </button>
            ) : null}
        </div>
    );
}
