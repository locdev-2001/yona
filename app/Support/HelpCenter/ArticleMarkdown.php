<?php

namespace App\Support\HelpCenter;

use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\Table\TableExtension;
use League\CommonMark\MarkdownConverter;

// Render bài viết Help Center: CommonMark + bảng, bọc bảng trong `.tableWrapper`, `^chữ^` thành <sup>,
// đọc bề rộng cột từ chú thích `<!--cw-colwidths:...-->` mà trình soạn thảo ghi ra.
final class ArticleMarkdown
{
    // Trùng cellMinWidth của schema ProseMirror dùng chung.
    private const TABLE_CELL_MIN_WIDTH_PX = 50;

    private const COLWIDTHS_PATTERN = '/<!--cw-colwidths:([\d,]+)-->/';

    public static function toHtml(?string $content): string
    {
        $markdown = (string) $content;

        if (trim($markdown) === '') {
            return '';
        }

        $columnWidths = self::extractColumnWidths($markdown);
        $markdown = preg_replace(self::COLWIDTHS_PATTERN, '', $markdown) ?? $markdown;

        $html = self::converter()->convert($markdown)->getContent();
        $html = self::renderSuperscripts($html);

        return self::wrapTables($html, $columnWidths);
    }

    // `render_category_content`: markdown về chữ thuần cho đoạn trích danh sách.
    public static function toPlainText(?string $content): string
    {
        $text = strip_tags(self::toHtml($content));

        return trim(html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }

    private static function converter(): MarkdownConverter
    {
        $environment = new Environment(['html_input' => 'strip', 'allow_unsafe_links' => false]);
        $environment->addExtension(new CommonMarkCoreExtension);
        $environment->addExtension(new TableExtension);

        return new MarkdownConverter($environment);
    }

    /**
     * @return list<list<int>>
     */
    private static function extractColumnWidths(string $markdown): array
    {
        preg_match_all(self::COLWIDTHS_PATTERN, $markdown, $matches);

        return array_map(
            static fn (string $group): array => array_map('intval', explode(',', $group)),
            $matches[1],
        );
    }

    // `<sup>` chỉ áp cho phần chữ nằm ngoài thẻ, không đụng thuộc tính HTML.
    private static function renderSuperscripts(string $html): string
    {
        return (string) preg_replace_callback(
            '/>([^<]*)</',
            static fn (array $match): string => '>'.preg_replace('/\^([^\^]+)\^/', '<sup>$1</sup>', $match[1]).'<',
            $html,
        );
    }

    /**
     * @param  list<list<int>>  $columnWidths
     */
    private static function wrapTables(string $html, array $columnWidths): string
    {
        $index = 0;

        return (string) preg_replace_callback(
            '/<table>.*?<\/table>/s',
            static function (array $match) use (&$index, $columnWidths): string {
                $widths = $columnWidths[$index] ?? [];
                $index++;

                if (! self::hasSizedColumns($widths)) {
                    return '<div class="tableWrapper">'.$match[0].'</div>';
                }

                $total = self::totalWidth($widths);
                $fully = self::isFullySized($widths);
                $wrapperStyle = $fully ? ' style="width: '.$total.'px; max-width: 100%;"' : '';
                $table = str_replace(
                    '<table>',
                    '<table style="'.self::tableSizingStyle($widths).'">'."\n".self::colgroupHtml($widths),
                    $match[0],
                );

                return '<div class="tableWrapper"'.$wrapperStyle.'>'.$table.'</div>';
            },
            $html,
        );
    }

    /**
     * @param  list<int>  $widths
     */
    private static function hasSizedColumns(array $widths): bool
    {
        return array_filter($widths, static fn (int $width): bool => $width > 0) !== [];
    }

    /**
     * @param  list<int>  $widths
     */
    private static function isFullySized(array $widths): bool
    {
        return $widths !== [] && array_filter($widths, static fn (int $width): bool => $width <= 0) === [];
    }

    /**
     * @param  list<int>  $widths
     */
    private static function totalWidth(array $widths): int
    {
        return array_sum(array_map(
            static fn (int $width): int => $width > 0 ? $width : self::TABLE_CELL_MIN_WIDTH_PX,
            $widths,
        ));
    }

    /**
     * @param  list<int>  $widths
     */
    private static function tableSizingStyle(array $widths): string
    {
        $total = self::totalWidth($widths);

        return self::isFullySized($widths)
            ? "table-layout: fixed; width: {$total}px !important; min-width: {$total}px !important;"
            : "table-layout: fixed; min-width: max(100%, {$total}px) !important;";
    }

    /**
     * @param  list<int>  $widths
     */
    private static function colgroupHtml(array $widths): string
    {
        $columns = array_map(
            static fn (int $width): string => $width > 0 ? '<col style="width: '.$width.'px;">' : '<col>',
            $widths,
        );

        return '<colgroup>'.implode('', $columns)."</colgroup>\n";
    }
}
