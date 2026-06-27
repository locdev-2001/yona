<?php

namespace Modules\Announcements\Support;

use League\CommonMark\CommonMarkConverter;

/**
 * Single write-path chokepoint for converting announcement Markdown → HTML.
 *
 * Security posture:
 *   html_input=strip  — raw HTML in body is stripped entirely (not escaped),
 *                        preventing XSS via crafted Markdown with embedded HTML.
 *   allow_unsafe_links=false — javascript: / vbscript: / data: hrefs rejected.
 *
 * FE must render body_html (the output of this class) via the shared
 * announcement-body.tsx component — never render raw `body` on the client.
 */
final class AnnouncementMarkdown
{
    /**
     * Convert Markdown string to sanitized HTML.
     *
     * Strips any raw HTML tags present in the input before converting so that
     * the output is safe to render with dangerouslySetInnerHTML on the client.
     */
    public static function toHtml(string $markdown): string
    {
        $converter = new CommonMarkConverter([
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
        ]);

        return (string) $converter->convert($markdown);
    }
}
