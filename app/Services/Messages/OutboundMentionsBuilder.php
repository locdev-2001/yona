<?php

namespace App\Services\Messages;

use App\Channels\Capability;
use App\Models\Message;

/**
 * Neo `content_attributes.mentions` của tin agent gửi đi vào nội dung CUỐI của tin
 * (đã render biến Liquid), để mọi kênh nhận cùng một bất biến:
 * `content` cắt tại [offset, offset + length) đúng bằng `'@'.name`, đơn vị UTF-16
 * (chỉ số chuỗi JavaScript — trùng quy ước chiều vào của kênh), không chồng nhau,
 * sắp theo offset.
 *
 * `offset` client gửi lên chỉ là gợi ý: Liquid, markdown hay emoji đều có thể làm
 * nó lệch. Mục không tìm thấy `@name` trong nội dung bị bỏ, không làm hỏng tin.
 * Tin đến và tin kênh dội lại giữ nguyên vị trí nền tảng đã cấp.
 */
class OutboundMentionsBuilder
{
    /** Hình dạng chuẩn của một mục nhắc tên, dùng chung cho cả hai chiều. */
    public const KEYS = ['external_id', 'name', 'offset', 'length'];

    /** `external_id` trung tính của mục "nhắc cả nhóm"; driver kênh tự đổi sang mã của nền tảng. */
    public const EVERYONE = 'all';

    private const MAX_MENTIONS = 50;

    private const AGENT_AUTHORED_TYPES = [Message::TYPE_OUTGOING, Message::TYPE_TEMPLATE];

    private const WORD_CHARACTER = '/[\p{L}\p{N}\p{M}]/u';

    private ?string $utf16Content = null;

    public function __construct(private readonly Message $message) {}

    public function perform(): void
    {
        $attributes = $this->message->content_attributes ?? [];

        if (! array_key_exists('mentions', $attributes) || ! $this->isAgentAuthored($attributes)) {
            return;
        }

        $mentions = $this->canCarryMentions() ? $this->withoutUnsupportedEveryone($this->anchor($attributes['mentions'])) : [];

        if ($mentions === []) {
            unset($attributes['mentions']);
        } else {
            $attributes['mentions'] = $mentions;
        }

        $this->message->content_attributes = $attributes;
    }

    /** @param array<string, mixed> $attributes */
    private function isAgentAuthored(array $attributes): bool
    {
        return in_array($this->message->message_type, self::AGENT_AUTHORED_TYPES, true)
            && ($attributes['external_echo'] ?? false) !== true;
    }

    /** Ghi chú riêng không đi ra kênh; kênh không khai năng lực thì tag chỉ là dữ liệu giả. */
    private function canCarryMentions(): bool
    {
        return ! $this->message->private
            && $this->message->inbox?->supports(Capability::OutboundMention) === true;
    }

    /**
     * @param  list<array{external_id: string, name: string, offset: int, length: int}>  $mentions
     * @return list<array{external_id: string, name: string, offset: int, length: int}>
     */
    private function withoutUnsupportedEveryone(array $mentions): array
    {
        if ($this->message->inbox?->supports(Capability::OutboundMentionAll) === true) {
            return $mentions;
        }

        return array_values(array_filter($mentions, fn (array $mention) => $mention['external_id'] !== self::EVERYONE));
    }

    /**
     * Dời mục đã neo sang bản chữ gửi ra kênh (đã bỏ cú pháp markdown): lần xuất
     * hiện thứ k của `@Tên` trong nội dung lưu ứng với lần thứ k trong bản gửi.
     * Mục không còn tìm thấy thì bỏ, không làm hỏng tin.
     *
     * @param  list<array{external_id: string, name: string, offset: int, length: int}>  $mentions
     * @return list<array{external_id: string, name: string, offset: int, length: int}>
     */
    public static function reanchor(array $mentions, string $storedContent, string $sentText): array
    {
        if ($storedContent === $sentText) {
            return $mentions;
        }

        $reanchored = [];

        foreach ($mentions as $mention) {
            $needle = '@'.$mention['name'];
            $occurrence = self::occurrenceIndexAt($storedContent, $needle, $mention['offset']);
            $position = $occurrence === null ? null : self::nthOccurrence($sentText, $needle, $occurrence);

            if ($position !== null) {
                $reanchored[] = [...$mention, 'offset' => self::utf16Length(substr($sentText, 0, $position))];
            }
        }

        return $reanchored;
    }

    private static function occurrenceIndexAt(string $content, string $needle, int $utf16Offset): ?int
    {
        $index = 0;

        for ($position = strpos($content, $needle); $position !== false; $position = strpos($content, $needle, $position + 1)) {
            if (self::utf16Length(substr($content, 0, $position)) === $utf16Offset) {
                return $index;
            }

            $index++;
        }

        return null;
    }

    private static function nthOccurrence(string $content, string $needle, int $index): ?int
    {
        $position = strpos($content, $needle);

        for ($seen = 0; $position !== false && $seen < $index; $seen++) {
            $position = strpos($content, $needle, $position + 1);
        }

        return $position === false ? null : $position;
    }

    /** @return list<array{external_id: string, name: string, offset: int, length: int}> */
    private function anchor(mixed $raw): array
    {
        $content = (string) $this->message->content;
        $candidates = $this->candidates($raw);

        /** @var array<int, array{external_id: string, name: string, position: int, needle: string}> $taken */
        $taken = [];

        foreach ($candidates as $index => $candidate) {
            $position = $candidate['hint'] === null ? null : $this->bytePosition($content, $candidate['hint']);

            if ($position !== null && $this->isMentionAt($content, $candidate['needle'], $position, $taken)) {
                $taken[$index] = [...$candidate, 'position' => $position];
            }
        }

        foreach ($candidates as $index => $candidate) {
            if (isset($taken[$index])) {
                continue;
            }

            $position = $this->firstFreeOccurrence($content, $candidate['needle'], $taken);

            if ($position !== null) {
                $taken[$index] = [...$candidate, 'position' => $position];
            }
        }

        usort($taken, fn (array $a, array $b) => $a['position'] <=> $b['position']);

        return array_map(fn (array $mention) => [
            'external_id' => $mention['external_id'],
            'name' => $mention['name'],
            'offset' => self::utf16Length(substr($content, 0, $mention['position'])),
            'length' => self::utf16Length($mention['needle']),
        ], $taken);
    }

    /** @return list<array{external_id: string, name: string, needle: string, hint: int|null}> */
    private function candidates(mixed $raw): array
    {
        if (! is_array($raw)) {
            return [];
        }

        $candidates = [];

        foreach (array_slice(array_values($raw), 0, self::MAX_MENTIONS) as $item) {
            if (! is_array($item)) {
                continue;
            }

            $externalId = is_scalar($item['external_id'] ?? null) ? trim((string) $item['external_id']) : '';
            $name = is_string($item['name'] ?? null) ? ltrim(trim($item['name']), '@') : '';

            if ($externalId === '' || $name === '') {
                continue;
            }

            $candidates[] = [
                'external_id' => $externalId,
                'name' => $name,
                'needle' => '@'.$name,
                'hint' => self::offsetHint($item['offset'] ?? null),
            ];
        }

        return $candidates;
    }

    private static function offsetHint(mixed $offset): ?int
    {
        if (is_int($offset)) {
            return $offset >= 0 ? $offset : null;
        }

        return is_string($offset) && ctype_digit($offset) ? (int) $offset : null;
    }

    /** @param array<int, array{position: int, needle: string}> $taken */
    private function firstFreeOccurrence(string $content, string $needle, array $taken): ?int
    {
        for ($position = strpos($content, $needle); $position !== false; $position = strpos($content, $needle, $position + 1)) {
            if ($this->isMentionAt($content, $needle, $position, $taken)) {
                return $position;
            }
        }

        return null;
    }

    /**
     * `@An` không được khớp vào `@Anh` hay vào giữa một địa chỉ email; mục đã neo
     * không được chồng lên nhau.
     *
     * @param  array<int, array{position: int, needle: string}>  $taken
     */
    private function isMentionAt(string $content, string $needle, int $position, array $taken): bool
    {
        if (substr($content, $position, strlen($needle)) !== $needle) {
            return false;
        }

        $end = $position + strlen($needle);
        $before = $position === 0 ? '' : mb_substr(substr($content, 0, $position), -1);
        $after = mb_substr(substr($content, $end), 0, 1);

        if (preg_match(self::WORD_CHARACTER, $before) === 1 || preg_match(self::WORD_CHARACTER, $after) === 1) {
            return false;
        }

        foreach ($taken as $mention) {
            if ($position < $mention['position'] + strlen($mention['needle']) && $mention['position'] < $end) {
                return false;
            }
        }

        return true;
    }

    /** Vị trí byte trong UTF-8 ứng với chỉ số UTF-16; vượt quá nội dung thì null. */
    private function bytePosition(string $content, int $utf16Offset): ?int
    {
        $this->utf16Content ??= mb_convert_encoding($content, 'UTF-16LE', 'UTF-8');

        if ($utf16Offset * 2 > strlen($this->utf16Content)) {
            return null;
        }

        return strlen(mb_convert_encoding(substr($this->utf16Content, 0, $utf16Offset * 2), 'UTF-8', 'UTF-16LE'));
    }

    private static function utf16Length(string $text): int
    {
        return intdiv(strlen(mb_convert_encoding($text, 'UTF-16LE', 'UTF-8')), 2);
    }
}
