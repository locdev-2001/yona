import type { MouseEvent } from 'react';

import { t } from '../../../i18n';
import { getPlainText } from 'shared/helpers/MessageFormatter';
import { excerptAroundFirstMatch } from 'shared/helpers/searchFold';
import { useExpandableContent } from '../useExpandableContent';
import type { SearchMessage } from '../types';
import HighlightedText from './HighlightedText';

// Port từ dashboard/modules/search/components/MessageContent.vue.
interface MessageContentProps {
    author?: string;
    message: SearchMessage;
    searchTerm?: string;
}

// Tìm trên nội dung, tiêu đề email, hoặc lời thoại của tệp âm thanh.
function resolveContent(message: SearchMessage): string {
    if (message.content) return message.content;

    const email = message.contentAttributes?.email as { subject?: string } | undefined;
    if (email?.subject) return email.subject;

    // Lời thoại (transcribed_text) là tính năng EE, payload đính kèm chưa có.
    return '';
}

export default function MessageContent({ author = '', message, searchTerm = '' }: MessageContentProps) {
    const { contentElement, showReadMore, showReadLess, toggleExpanded } = useExpandableContent();

    const authorText = author ? `${author} ${t('SEARCH.WROTE')} ` : '';
    const plainText = getPlainText(resolveContent(message));
    // Thu gọn thì bắt đầu ngay trước từ khoá, để phần bị cắt không nuốt mất nó.
    const visibleText = showReadMore ? excerptAroundFirstMatch(plainText, searchTerm) : plainText;

    const toggle = (expanded: boolean) => (event: MouseEvent) => {
        event.preventDefault();
        toggleExpanded(expanded);
    };

    return (
        <div
            ref={contentElement}
            className={`break-words grid text-n-slate-11 text-sm leading-relaxed ${
                showReadMore ? 'grid-cols-[1fr_auto] items-end' : 'grid-cols-1 items-center'
            }`}
        >
            {/* Thu gọn còn đúng hai dòng — bằng ngưỡng mặc định của useExpandableContent. Một
                dòng thì trên điện thoại tên người gửi dài đã chiếm gần hết, từ khoá rơi mất. */}
            <div className={`min-w-0 ${showReadMore ? 'line-clamp-2' : ''}`}>
                {authorText ? <span className="text-n-slate-11 font-medium leading-4">{authorText}</span> : null}
                <HighlightedText className="message-content text-n-slate-12" text={visibleText} query={searchTerm} />
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
