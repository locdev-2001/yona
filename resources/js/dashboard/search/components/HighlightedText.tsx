import { Fragment } from 'react';

import { SEARCH_MATCH_CLASS } from 'dashboard/helper/searchHighlight';
import { highlightSegments } from 'shared/helpers/searchFold';

interface HighlightedTextProps {
    text: string;
    query: string;
    className?: string;
}

// Chữ thường của React (không HTML thô), đoạn khớp từ khoá không dấu được tô nền.
export default function HighlightedText({ text, query, className }: HighlightedTextProps) {
    return (
        <span className={className}>
            {highlightSegments(text, query).map((segment, index) =>
                segment.match ? (
                    <mark key={index} className={SEARCH_MATCH_CLASS}>
                        {segment.text}
                    </mark>
                ) : (
                    <Fragment key={index}>{segment.text}</Fragment>
                ),
            )}
        </span>
    );
}
