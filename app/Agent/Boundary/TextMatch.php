<?php

namespace App\Agent\Boundary;

use Illuminate\Support\Str;

// Xếp hạng văn bản ngắn của shop theo một câu hỏi, không phân biệt dấu tiếng Việt: mỗi
// từ của câu hỏi có mặt trong tài liệu được cộng trọng số hiếm (từ xuất hiện ở hầu hết
// tài liệu như "shop", "có" gần như không tính), nhân trọng số của trường chứa nó (tên
// nặng hơn nội dung). So khớp theo nguyên âm tiết, không theo chuỗi con: "ao" không khớp
// "giao". Đủ cho kho tri thức cỡ SME (vài trăm tài liệu) xếp hạng ngay trong PHP.
final class TextMatch
{
    private const MIN_TERM_CHARACTERS = 2;

    /**
     * @template TKey of array-key
     *
     * @param  array<TKey, list<array{0: string, 1: float}>>  $documents  khoá → các trường (chữ, trọng số)
     * @return list<TKey> khoá có khớp, điểm cao trước, cùng điểm giữ thứ tự đưa vào
     */
    public static function rank(string $query, array $documents): array
    {
        $terms = self::terms($query);

        if ($terms === [] || $documents === []) {
            return [];
        }

        $fieldWords = array_map(
            fn (array $fields) => array_map(fn (array $field) => [array_flip(self::words($field[0])), $field[1]], $fields),
            $documents,
        );
        $idf = self::inverseFrequencies($terms, $fieldWords);
        $scored = [];
        $position = 0;

        foreach ($fieldWords as $key => $fields) {
            $score = 0.0;

            foreach ($terms as $term) {
                $weight = 0.0;

                foreach ($fields as [$words, $fieldWeight]) {
                    $weight = isset($words[$term]) ? max($weight, $fieldWeight) : $weight;
                }

                $score += $weight * $idf[$term];
            }

            if ($score > 0) {
                $scored[] = ['key' => $key, 'score' => $score, 'position' => $position];
            }

            $position++;
        }

        usort($scored, fn (array $left, array $right) => [$right['score'], $left['position']] <=> [$left['score'], $right['position']]);

        return array_column($scored, 'key');
    }

    // Chữ thường, bỏ dấu: khách gõ "ao thun" vẫn khớp "Áo thun".
    public static function fold(string $text): string
    {
        return mb_strtolower(Str::ascii($text));
    }

    /** @return list<string> các từ khác nhau của câu hỏi, đã bỏ dấu */
    public static function terms(string $text): array
    {
        return array_values(array_filter(self::words($text), fn (string $word) => mb_strlen($word) >= self::MIN_TERM_CHARACTERS));
    }

    /** @return list<string> */
    private static function words(string $text): array
    {
        return array_values(array_unique(preg_split('/[^\p{L}\p{N}]+/u', self::fold(strip_tags($text)), -1, PREG_SPLIT_NO_EMPTY) ?: []));
    }

    /**
     * Trọng số hiếm của từng từ (kiểu BM25): từ có ở mọi tài liệu gần bằng 0, không âm.
     *
     * @param  list<string>  $terms
     * @param  array<array-key, list<array{0: array<string, int>, 1: float}>>  $fieldWords
     * @return array<string, float>
     */
    private static function inverseFrequencies(array $terms, array $fieldWords): array
    {
        $total = count($fieldWords);
        $idf = [];

        foreach ($terms as $term) {
            $containing = 0;

            foreach ($fieldWords as $fields) {
                foreach ($fields as [$words]) {
                    if (isset($words[$term])) {
                        $containing++;

                        break;
                    }
                }
            }

            $idf[$term] = log(1 + ($total - $containing + 0.5) / ($containing + 0.5));
        }

        return $idf;
    }
}
