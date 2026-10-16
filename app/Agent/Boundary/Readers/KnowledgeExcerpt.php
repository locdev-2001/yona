<?php

namespace App\Agent\Boundary\Readers;

use Illuminate\Support\Str;

// Trích đoạn một nguồn tri thức cho mô hình đọc trong trần ký tự. Nguồn ngắn giữ nguyên.
// Nguồn dài: phần mở đầu (thường là tóm tắt) cộng các khúc quanh từ khoá của truy vấn,
// ưu tiên khúc khớp nhiều từ khoá khác nhau rồi khúc có chữ số (giá, hạn, số lượng),
// để giá hay chính sách nằm cuối bài không bị cắt mất.
final class KnowledgeExcerpt
{
    private const LEAD_CHARACTERS = 200;

    private const BEFORE_MATCH = 80;

    private const AFTER_MATCH = 220;

    private const MIN_TERM_CHARACTERS = 2;

    private const MAX_MATCHES_PER_TERM = 20;

    private const GAP = ' … ';

    public static function of(string $text, string $query, int $maxCharacters): string
    {
        $plain = trim((string) preg_replace('/\s+/u', ' ', strip_tags($text)));
        $length = mb_strlen($plain);

        if ($length <= $maxCharacters) {
            return $plain;
        }

        $windows = self::matchWindows($plain, $query);

        if ($windows === []) {
            return Str::limit($plain, $maxCharacters - 1, '…');
        }

        $lead = [0, min(self::LEAD_CHARACTERS, $length)];
        $chosen = [$lead];
        $budget = $maxCharacters - ($lead[1] - $lead[0]) - mb_strlen(self::GAP) - 1;

        foreach ($windows as [$start, $end]) {
            $cost = $end - $start + mb_strlen(self::GAP);

            if ($cost <= $budget) {
                $chosen[] = [$start, $end];
                $budget -= $cost;
            }
        }

        return self::join($plain, self::merge($chosen), $length);
    }

    /**
     * Khúc quanh mọi lần khớp từ khoá, đã gộp khúc chồng nhau, xếp theo độ hữu ích.
     *
     * @return list<array{0: int, 1: int}>
     */
    private static function matchWindows(string $plain, string $query): array
    {
        $lower = mb_strtolower($plain);
        $length = mb_strlen($plain);
        $raw = [];

        foreach (self::terms($query) as $term) {
            $offset = 0;

            for ($found = 0; $found < self::MAX_MATCHES_PER_TERM; $found++) {
                $position = mb_strpos($lower, $term, $offset);

                if ($position === false) {
                    break;
                }

                $raw[] = [max(0, $position - self::BEFORE_MATCH), min($length, $position + mb_strlen($term) + self::AFTER_MATCH), $term];
                $offset = $position + mb_strlen($term);
            }
        }

        usort($raw, fn (array $left, array $right) => $left[0] <=> $right[0]);
        $merged = [];

        foreach ($raw as [$start, $end, $term]) {
            $last = array_key_last($merged);

            if ($last !== null && $start <= $merged[$last]['end']) {
                $merged[$last]['end'] = max($merged[$last]['end'], $end);
                $merged[$last]['terms'][$term] = true;

                continue;
            }

            $merged[] = ['start' => $start, 'end' => $end, 'terms' => [$term => true]];
        }

        $scored = array_map(fn (array $window) => [
            'span' => [$window['start'], $window['end']],
            'score' => count($window['terms']) * 2 + (preg_match('/\d/u', mb_substr($plain, $window['start'], $window['end'] - $window['start'])) === 1 ? 1 : 0),
        ], $merged);
        usort($scored, fn (array $left, array $right) => [$right['score'], $left['span'][0]] <=> [$left['score'], $right['span'][0]]);

        return array_column($scored, 'span');
    }

    /** @return list<string> */
    private static function terms(string $query): array
    {
        $words = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($query)) ?: [];

        return array_values(array_unique(array_filter($words, fn (string $word) => mb_strlen($word) >= self::MIN_TERM_CHARACTERS)));
    }

    /**
     * @param  list<array{0: int, 1: int}>  $spans
     * @return list<array{0: int, 1: int}>
     */
    private static function merge(array $spans): array
    {
        usort($spans, fn (array $left, array $right) => $left[0] <=> $right[0]);
        $merged = [];

        foreach ($spans as [$start, $end]) {
            $last = array_key_last($merged);

            if ($last !== null && $start <= $merged[$last][1]) {
                $merged[$last][1] = max($merged[$last][1], $end);

                continue;
            }

            $merged[] = [$start, $end];
        }

        return $merged;
    }

    /** @param  list<array{0: int, 1: int}>  $spans */
    private static function join(string $plain, array $spans, int $length): string
    {
        $pieces = array_map(function (array $span) use ($plain, $length) {
            $piece = mb_substr($plain, $span[0], $span[1] - $span[0]);
            // Bỏ chữ bị cắt dở ở hai đầu khúc.
            $piece = $span[0] > 0 ? (string) preg_replace('/^\S*\s/u', '', $piece) : $piece;
            $piece = $span[1] < $length ? (string) preg_replace('/\s\S*$/u', '', $piece) : $piece;

            return trim($piece);
        }, $spans);
        $excerpt = implode(self::GAP, $pieces);

        return end($spans)[1] < $length ? $excerpt.'…' : $excerpt;
    }
}
