<?php

namespace App\Support\Messages;

use App\Channels\TextFormat;
use App\Services\Email\MarkdownRenderer;
use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\Autolink\AutolinkExtension;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\CommonMark\Node\Block\BlockQuote;
use League\CommonMark\Extension\CommonMark\Node\Block\FencedCode;
use League\CommonMark\Extension\CommonMark\Node\Block\Heading;
use League\CommonMark\Extension\CommonMark\Node\Block\HtmlBlock;
use League\CommonMark\Extension\CommonMark\Node\Block\IndentedCode;
use League\CommonMark\Extension\CommonMark\Node\Block\ListBlock;
use League\CommonMark\Extension\CommonMark\Node\Block\ListItem;
use League\CommonMark\Extension\CommonMark\Node\Block\ThematicBreak;
use League\CommonMark\Extension\CommonMark\Node\Inline\Code;
use League\CommonMark\Extension\CommonMark\Node\Inline\Emphasis;
use League\CommonMark\Extension\CommonMark\Node\Inline\HtmlInline;
use League\CommonMark\Extension\CommonMark\Node\Inline\Image;
use League\CommonMark\Extension\CommonMark\Node\Inline\Link;
use League\CommonMark\Extension\CommonMark\Node\Inline\Strong;
use League\CommonMark\Extension\Strikethrough\Strikethrough;
use League\CommonMark\Extension\Strikethrough\StrikethroughExtension;
use League\CommonMark\Node\Block\Paragraph;
use League\CommonMark\Node\Inline\Newline;
use League\CommonMark\Node\Inline\Text;
use League\CommonMark\Node\Node;
use League\CommonMark\Parser\MarkdownParser;

/**
 * Bộ chuyển DUY NHẤT nội dung gửi ra kênh: bộ soạn lưu markdown, mỗi kênh khai
 * định dạng chữ nó hiển thị được (CapabilitySet::textFormat), lớp này dựng đúng
 * định dạng đó. Chỉ dùng lúc gửi đi — nội dung lưu và hộp thư giữ markdown.
 *
 * Đi qua cây cú pháp thay vì regex để escape `\*`, link có ngoặc trong URL, gạch
 * dưới giữa từ… được hiểu đúng như lúc hiển thị trong hộp thư.
 */
final class OutgoingText
{
    private const MENTION_SCHEME = 'mention://';

    /** Tiền tố mà autolink tự thêm vào chữ người gõ (`www.a.vn`, `a@b.vn`). */
    private const IMPLIED_SCHEME_PATTERN = '#^(mailto:|https?://)#i';

    /** Markdown gộp nhiều dòng trống thành một ngắt đoạn; giữ nguyên số dòng người gõ. */
    private const BLANK_LINES_PATTERN = '/\n{2,}/';

    private const BLANK_LINES_MARKER = "\u{E000}%d\u{E001}";

    private const BLANK_LINES_MARKER_PATTERN = '/\x{E000}(\d+)\x{E001}/u';

    private static ?MarkdownParser $parser = null;

    private function __construct(private readonly TextFormat $format) {}

    public static function render(?string $markdown, TextFormat $format): ?string
    {
        if ($markdown === null || trim($markdown) === '') {
            return $markdown;
        }

        return match ($format) {
            TextFormat::Markdown => $markdown,
            TextFormat::Html => MarkdownRenderer::render($markdown, true),
            default => (new self($format))->convert($markdown),
        };
    }

    private function convert(string $markdown): string
    {
        $normalized = preg_replace('/^[ \t]+$/m', '', str_replace("\r\n", "\n", $markdown)) ?? $markdown;
        $marked = preg_replace_callback(
            self::BLANK_LINES_PATTERN,
            static fn (array $match) => sprintf(self::BLANK_LINES_MARKER, strlen($match[0])),
            $normalized,
        ) ?? $normalized;

        $text = $this->blocks(self::parser()->parse($marked));

        return preg_replace_callback(
            self::BLANK_LINES_MARKER_PATTERN,
            static fn (array $match) => str_repeat("\n", (int) $match[1]),
            trim($text, "\n"),
        ) ?? $text;
    }

    private static function parser(): MarkdownParser
    {
        if (self::$parser === null) {
            $environment = new Environment(['html_input' => 'allow']);
            $environment->addExtension(new CommonMarkCoreExtension);
            $environment->addExtension(new StrikethroughExtension);
            // URL trần thành một nút link nguyên khối, để `_` hay `*` trong URL không bị hiểu là dấu nhấn.
            $environment->addExtension(new AutolinkExtension);
            self::$parser = new MarkdownParser($environment);
        }

        return self::$parser;
    }

    private function blocks(Node $parent, string $separator = "\n"): string
    {
        $parts = [];

        foreach ($parent->children() as $child) {
            $parts[] = $this->block($child);
        }

        return implode($separator, $parts);
    }

    private function block(Node $node): string
    {
        return match (true) {
            $node instanceof Paragraph => $this->inlines($node),
            $node instanceof Heading => $this->strong($this->inlines($node)),
            $node instanceof ListBlock => $this->listBlock($node),
            $node instanceof BlockQuote => $this->blockQuote($this->blocks($node)),
            $node instanceof FencedCode, $node instanceof IndentedCode => $this->codeBlock(rtrim($node->getLiteral(), "\n")),
            $node instanceof HtmlBlock => $this->escape(rtrim($node->getLiteral(), "\n")),
            $node instanceof ThematicBreak => '---',
            default => $this->blocks($node),
        };
    }

    private function listBlock(ListBlock $list): string
    {
        $data = $list->getListData();
        $number = (int) ($data->start ?? 1);
        $items = [];

        foreach ($list->children() as $item) {
            $bullet = $data->type === ListBlock::TYPE_ORDERED
                ? ($number++).'. '
                : ($this->format === TextFormat::TelegramHtml ? '• ' : '- ');

            $items[] = $bullet.($item instanceof ListItem ? $this->blocks($item) : $this->block($item));
        }

        return implode("\n", $items);
    }

    private function inlines(Node $parent): string
    {
        $text = '';

        foreach ($parent->children() as $child) {
            $text .= $this->inline($child);
        }

        return $text;
    }

    private function inline(Node $node): string
    {
        return match (true) {
            $node instanceof Text => $this->escape($node->getLiteral()),
            $node instanceof Newline => "\n",
            $node instanceof Code => $this->code($node->getLiteral()),
            $node instanceof HtmlInline => $this->escape($node->getLiteral()),
            $node instanceof Strong => $this->strong($this->inlines($node)),
            $node instanceof Emphasis => $this->emphasis($this->inlines($node)),
            $node instanceof Strikethrough => $this->strikethrough($this->inlines($node)),
            $node instanceof Link, $node instanceof Image => $this->link($node->getUrl(), $node),
            default => $this->inlines($node),
        };
    }

    /**
     * Nhắc tên chỉ còn `@Tên`. Link có chữ khác URL thành "chữ URL" để khách vẫn
     * bấm được; chữ trùng URL (autolink) chỉ còn URL.
     */
    private function link(string $url, Node $node): string
    {
        $label = $this->inlines($node);

        if (str_starts_with($url, self::MENTION_SCHEME)) {
            return $label;
        }

        $plainLabel = $this->plainLabel($node);

        if ($this->format === TextFormat::TelegramHtml) {
            return '<a href="'.htmlspecialchars($url, ENT_QUOTES | ENT_HTML5).'">'.($label === '' ? $this->escape($url) : $label).'</a>';
        }

        if ($plainLabel === '') {
            return $url;
        }

        if ($plainLabel === $url || $plainLabel === preg_replace(self::IMPLIED_SCHEME_PATTERN, '', $url)) {
            return $plainLabel;
        }

        return $label.' '.$url;
    }

    private function plainLabel(Node $node): string
    {
        $text = '';

        foreach ($node->iterator() as $descendant) {
            if ($descendant instanceof Text || $descendant instanceof Code) {
                $text .= $descendant->getLiteral();
            }
        }

        return trim($text);
    }

    private function strong(string $text): string
    {
        return match ($this->format) {
            TextFormat::WhatsApp => $this->wrap('*', $text),
            TextFormat::TelegramHtml => "<b>{$text}</b>",
            default => $text,
        };
    }

    private function emphasis(string $text): string
    {
        return match ($this->format) {
            TextFormat::WhatsApp => $this->wrap('_', $text),
            TextFormat::TelegramHtml => "<i>{$text}</i>",
            default => $text,
        };
    }

    private function strikethrough(string $text): string
    {
        return match ($this->format) {
            TextFormat::WhatsApp => $this->wrap('~', $text),
            TextFormat::TelegramHtml => "<s>{$text}</s>",
            default => $text,
        };
    }

    private function code(string $literal): string
    {
        return match ($this->format) {
            TextFormat::WhatsApp => "`{$literal}`",
            TextFormat::TelegramHtml => '<code>'.$this->escape($literal).'</code>',
            default => $literal,
        };
    }

    private function codeBlock(string $literal): string
    {
        return match ($this->format) {
            TextFormat::WhatsApp => "```{$literal}```",
            TextFormat::TelegramHtml => '<pre>'.$this->escape($literal).'</pre>',
            default => $literal,
        };
    }

    private function blockQuote(string $text): string
    {
        return match ($this->format) {
            TextFormat::WhatsApp => preg_replace('/^/m', '> ', $text) ?? $text,
            TextFormat::TelegramHtml => "<blockquote>{$text}</blockquote>",
            default => $text,
        };
    }

    /** Dấu nhấn kiểu WhatsApp phải ôm sát chữ, khoảng trắng đầu/cuối để ra ngoài. */
    private function wrap(string $marker, string $text): string
    {
        if (trim($text) === '') {
            return $text;
        }

        preg_match('/^(\s*)(.*?)(\s*)$/su', $text, $parts);

        return $parts[1].$marker.$parts[2].$marker.$parts[3];
    }

    private function escape(string $text): string
    {
        return $this->format === TextFormat::TelegramHtml
            ? htmlspecialchars($text, ENT_NOQUOTES | ENT_HTML5, 'UTF-8')
            : $text;
    }
}
