import { Fragment, useState } from 'react';

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
/** Dấu câu dính cuối URL trong câu ("xem https://a.vn/x.") — không thuộc link. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;
const IMAGE_URL_PATTERN = /\.(png|jpe?g|gif|webp)($|\?)/i;

/** URL dài chiếm cả bubble → rút gọn hiển thị (href giữ nguyên, hover thấy full). */
const LINK_DISPLAY_MAX = 64;
const LINK_DISPLAY_HEAD = 48;
const LINK_DISPLAY_TAIL = 12;

function truncateUrlForDisplay(url: string): string {
    if (url.length <= LINK_DISPLAY_MAX) return url;
    return `${url.slice(0, LINK_DISPLAY_HEAD)}…${url.slice(-LINK_DISPLAY_TAIL)}`;
}

/**
 * Body tin nhắn: text thường + URL bấm được (mở tab mới); URL ảnh render luôn
 * ảnh inline. Prefix "[Link]" bridge thêm vào chỉ là noise hiển thị → ẩn.
 */
export function LinkifiedText({ text }: { text: string }) {
    const cleaned = text.replace(/^\[Link\]\s*/, '');
    const parts = cleaned.split(URL_PATTERN);
    if (parts.length === 1) return <>{cleaned}</>;

    return (
        <>
            {parts.map((part, index) => {
                if (!part.startsWith('http://') && !part.startsWith('https://')) {
                    return <Fragment key={index}>{part}</Fragment>;
                }
                const trailing = part.match(TRAILING_PUNCTUATION)?.[0] ?? '';
                const url = trailing ? part.slice(0, -trailing.length) : part;
                return (
                    <Fragment key={index}>
                        {IMAGE_URL_PATTERN.test(url) ? (
                            <ImageLink url={url} />
                        ) : (
                            <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                title={url}
                                className="underline underline-offset-2 opacity-90 hover:opacity-100"
                            >
                                {truncateUrlForDisplay(url)}
                            </a>
                        )}
                        {trailing}
                    </Fragment>
                );
            })}
        </>
    );
}

/** URL ảnh → preview inline; ảnh hỏng (CDN hết hạn) → rơi về link thường. */
function ImageLink({ url }: { url: string }) {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return (
            <a href={url} target="_blank" rel="noreferrer" className="underline underline-offset-2 opacity-90 hover:opacity-100">
                {url}
            </a>
        );
    }

    return (
        <a href={url} target="_blank" rel="noreferrer" className="block w-fit">
            <img
                src={url}
                alt=""
                className="my-1 max-h-72 max-w-full rounded-lg object-contain"
                loading="lazy"
                decoding="async"
                onError={() => setFailed(true)}
            />
        </a>
    );
}
