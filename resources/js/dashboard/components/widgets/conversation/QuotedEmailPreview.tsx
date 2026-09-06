import { useState } from 'react';
import DOMPurify from 'dompurify';

import { t } from '../../../../i18n';
import MessageFormatter from 'shared/helpers/MessageFormatter';
import Button from 'dashboard/components-next/button/Button';

// Port từ components/widgets/conversation/QuotedEmailPreview.vue.
interface QuotedEmailPreviewProps {
    quotedEmailText: string;
    previewText: string;
    onToggle: () => void;
}

export default function QuotedEmailPreview({
    quotedEmailText,
    previewText,
    onToggle,
}: QuotedEmailPreviewProps) {
    const [isExpanded, setExpanded] = useState(false);

    const formattedQuotedEmailText = quotedEmailText
        ? new MessageFormatter(quotedEmailText).formattedMessage
        : '';

    const toggleExpand = () => setExpanded(current => !current);

    return (
        <div className="mt-2">
            <div className="relative rounded-md px-3 py-2 text-xs text-n-slate-12 bg-n-slate-3 dark:bg-n-solid-3">
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <Button
                        title={
                            isExpanded
                                ? t('CONVERSATION.REPLYBOX.QUOTED_REPLY.COLLAPSE')
                                : t('CONVERSATION.REPLYBOX.QUOTED_REPLY.EXPAND')
                        }
                        ghost
                        slate
                        xs
                        icon={isExpanded ? 'i-lucide-minimize' : 'i-lucide-maximize'}
                        onClick={toggleExpand}
                    />
                    <Button
                        title={t('CONVERSATION.REPLYBOX.QUOTED_REPLY.REMOVE_PREVIEW')}
                        ghost
                        slate
                        xs
                        icon="i-lucide-x"
                        onClick={onToggle}
                    />
                </div>
                <div
                    className={`w-full max-w-none break-words prose prose-sm dark:prose-invert cursor-pointer ltr:pr-8 rtl:pl-8 ${
                        isExpanded ? 'max-h-60 overflow-y-auto' : 'line-clamp-1'
                    }`}
                    title={previewText}
                    onClick={toggleExpand}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedQuotedEmailText) }}
                />
            </div>
        </div>
    );
}
