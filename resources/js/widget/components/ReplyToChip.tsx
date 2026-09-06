import { useEffect, useRef } from 'react';

import FluentIcon from 'shared/components/FluentIcon/FluentIcon';

import { t } from '../i18n';
import type { WidgetMessage } from '../types';

// Port từ widget/components/ReplyToChip.vue
export default function ReplyToChip({ replyTo }: { replyTo: WidgetMessage }) {
    const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
    }, []);

    const attachmentLabel = replyTo?.attachments?.length
        ? t(`ATTACHMENTS.${replyTo.attachments[0].file_type}.CONTENT`)
        : '';

    const navigateTo = () => {
        const element = document.getElementById(`cwmsg-${replyTo.id}`);
        if (!element) return;
        element.scrollIntoView();
        element.classList.add('bg-n-slate-3', 'dark:bg-n-solid-3');
        highlightTimer.current = setTimeout(() => {
            element.classList.remove('bg-n-slate-3', 'dark:bg-n-solid-3');
        }, 500);
    };

    return (
        <button
            type="button"
            className="px-1.5 py-0.5 rounded-md text-n-slate-11 bg-n-slate-4 opacity-60 hover:opacity-100 cursor-pointer flex items-center gap-1.5"
            onClick={navigateTo}
        >
            <FluentIcon icon="arrow-reply" size="12" className="flex-shrink-0" />
            <div className="truncate max-w-[8rem]">{replyTo.content || attachmentLabel}</div>
        </button>
    );
}
