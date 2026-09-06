<?php

namespace App\Models\Concerns;

// Tương đương `record.errors.full_messages` + `to_sentence` của ActiveRecord:
// model tự nói mình sai ở đâu, controller chỉ việc dựng phản hồi 422.
trait SelfValidating
{
    /** @return list<string> */
    abstract public function validationMessages(): array;

    public function isValidRecord(): bool
    {
        return $this->validationMessages() === [];
    }

    public function validationSentence(): ?string
    {
        $messages = $this->validationMessages();

        return $messages === [] ? null : implode(', ', $messages);
    }

    /**
     * validates_column_content_length của ApplicationRecord: chặn payload khổng lồ
     * trên mọi cột string/text.
     *
     * @param  array<string, int>  $limits  tên cột => độ dài tối đa
     * @return list<string>
     */
    protected function lengthMessages(array $limits): array
    {
        $messages = [];

        foreach ($limits as $attribute => $max) {
            $value = $this->getAttribute($attribute);

            if (is_string($value) && mb_strlen($value) > $max) {
                $messages[] = self::humanize($attribute)." is too long (maximum is {$max} characters)";
            }
        }

        return $messages;
    }

    public static function humanize(string $attribute): string
    {
        return ucfirst(str_replace('_', ' ', $attribute));
    }
}
