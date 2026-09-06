import { useState } from 'react';

import { t } from '../../../i18n';

// Port từ dashboard/components/widgets/ShowMore.vue.
interface ShowMoreProps {
    text?: string;
    limit?: number;
}

export default function ShowMore({ text = '', limit = 120 }: ShowMoreProps) {
    const [isExpanded, setExpanded] = useState(false);
    const displayedText = isExpanded || text.length <= limit ? text : `${text.slice(0, limit)}...`;

    return (
        <span>
            {displayedText}
            {text.length > limit ? (
                <button
                    type="button"
                    className="text-n-brand !p-0 !border-0 align-top"
                    onClick={event => {
                        event.stopPropagation();
                        setExpanded(expanded => !expanded);
                    }}
                >
                    {t(`COMPONENTS.SHOW_MORE_BLOCK.${isExpanded ? 'SHOW_LESS' : 'SHOW_MORE'}`)}
                </button>
            ) : null}
        </span>
    );
}
