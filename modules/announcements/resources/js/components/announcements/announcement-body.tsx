/**
 * Renders server-sanitized announcement HTML content.
 *
 * SECURITY: ONLY ever pass `body_html` (server-rendered + Commonmark-sanitized).
 * NEVER pass the raw `body` markdown field. The `dangerouslySetInnerHTML` here is
 * intentional and safe because the HTML is sanitized server-side via
 * AnnouncementMarkdown (html_input=strip, allow_unsafe_links=false).
 */
export function AnnouncementBody({ bodyHtml }: { bodyHtml: string }) {
    return (
        <div
            className="prose prose-sm dark:prose-invert max-w-none"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
    );
}
