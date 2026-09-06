<?php

namespace App\Support;

/**
 * Bộ lọc `submitted_values` mà khách gửi lên (bong bóng bot: form, chọn nhanh,
 * khảo sát CSAT).
 *
 * Port của `params.permit(message: [{ submitted_values: [:name, :title, :value,
 * { csat_survey_response: [:feedback_message, :rating] }] }])` — dùng chung cho
 * API widget và API khảo sát công khai, vì cả hai đều ghi thẳng vào
 * `messages.content_attributes` rồi hiện lại cho agent.
 */
final class SubmittedValues
{
    private const SCALAR_KEYS = ['name', 'title', 'value'];

    private const CSAT_KEYS = ['feedback_message', 'rating'];

    /**
     * Rails nhận cả mảng (form/chọn nhanh) lẫn hash (CSAT) ở cùng một khóa.
     */
    public static function permit(mixed $values): ?array
    {
        if (! is_array($values)) {
            return null;
        }

        return array_is_list($values)
            ? array_values(array_map(self::permitEntry(...), $values))
            : self::permitEntry($values);
    }

    /** @return array<string, mixed> */
    private static function permitEntry(mixed $entry): array
    {
        if (! is_array($entry)) {
            return [];
        }

        $permitted = array_intersect_key($entry, array_flip(self::SCALAR_KEYS));
        $permitted = array_filter($permitted, fn (mixed $value) => is_scalar($value) || $value === null);

        if (isset($entry['csat_survey_response']) && is_array($entry['csat_survey_response'])) {
            $permitted['csat_survey_response'] = array_intersect_key(
                $entry['csat_survey_response'],
                array_flip(self::CSAT_KEYS),
            );
        }

        return $permitted;
    }
}
