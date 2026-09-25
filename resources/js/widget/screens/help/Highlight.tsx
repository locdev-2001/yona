import { Fragment } from 'react';

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Tô từ khoá trong đoạn trích kết quả tìm (không phân biệt hoa thường). Chữ thuần, không HTML. */
export default function Highlight({ text, query }: { text: string; query: string }) {
    const needle = query.trim();
    if (!needle) return <>{text}</>;

    const parts = text.split(new RegExp(`(${escape(needle)})`, 'giu'));

    return (
        <>
            {parts.map((part, index) =>
                index % 2 ? (
                    <mark key={index} className="rounded-[4px] bg-[var(--yona-chat-highlight)] px-0.5 text-inherit">
                        {part}
                    </mark>
                ) : (
                    <Fragment key={index}>{part}</Fragment>
                ),
            )}
        </>
    );
}
