import { Fragment } from 'react';

import { highlightSegments } from 'shared/helpers/searchFold';

interface HighlightedTextProps {
    text: string;
    query: string;
    className?: string;
}

// Chữ thường của React (không HTML thô), đoạn khớp từ khoá không dấu được in đậm.
export default function HighlightedText({ text, query, className }: HighlightedTextProps) {
    return (
        <span className={className}>
            {highlightSegments(text, query).map((segment, index) =>
                segment.match ? (
                    <mark key={index} className="bg-transparent font-semibold text-n-slate-12">
                        {segment.text}
                    </mark>
                ) : (
                    <Fragment key={index}>{segment.text}</Fragment>
                ),
            )}
        </span>
    );
}
