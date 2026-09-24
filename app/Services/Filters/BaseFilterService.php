<?php

namespace App\Services\Filters;

use App\Exceptions\CustomFilterException;
use App\Models\Account;
use App\Models\CustomAttributeDefinition;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Lõi trung tính của bộ lọc tuỳ chỉnh — port từ FilterService +
 * Filters::FilterHelper + Filters::CustomAttributeFilterHelper.
 *
 * Lớp này chỉ biết ba thứ: bảng đang lọc, bảng mô tả thuộc tính chuẩn
 * (FilterKeys) và model custom attribute tương ứng. Đặc thù của từng thực thể
 * (enum status của hội thoại, chuẩn hoá số điện thoại của liên hệ…) nằm ở lớp
 * con qua hai điểm mở: normalizeValue() và applyEntitySpecificColumn().
 *
 * Bản gốc ghép chuỗi SQL rồi where(string, binds); ở đây mọi giá trị VÀ tên
 * custom attribute đều là placeholder, chỉ tên bảng/cột thuộc whitelist mới
 * được nội suy.
 */
abstract class BaseFilterService
{
    private const PRESENCE_OPERATORS = ['is_present', 'is_not_present'];

    private const MAX_DAYS_BEFORE = 998;

    /** @param array<int, array<string, mixed>> $payload */
    public function __construct(
        protected readonly Account $account,
        protected readonly array $payload,
    ) {}

    /** @return array<string, array{attribute_type: string, data_type: string, filter_operators: list<string>}> */
    abstract protected function standardAttributes(): array;

    abstract protected function tableName(): string;

    /** conversation_attribute | contact_attribute */
    abstract protected function customAttributeModel(): string;

    /**
     * Cột đặc thù của thực thể (enum, cột đôi, ép kiểu riêng). Trả về true khi
     * đã tự xử lý; false để lõi áp cách chung.
     *
     * @param  Builder<*>  $query
     * @param  array<int, mixed>  $values
     */
    protected function applyEntitySpecificColumn(Builder $query, string $attributeKey, string $operator, array $values): bool
    {
        return false;
    }

    protected function normalizeValue(string $attributeKey, string $operator, mixed $value): mixed
    {
        return $value;
    }

    /**
     * Kiểm payload rồi gắn toàn bộ điều kiện vào query như MỘT nhóm.
     *
     * @param  Builder<*>  $query
     */
    protected function applyPayload(Builder $query): void
    {
        $conditions = $this->validatedConditions();

        $query->where(function (Builder $group) use ($conditions): void {
            foreach ($conditions as $index => $resolved) {
                $joiner = $index > 0
                    ? mb_strtolower(trim((string) ($conditions[$index - 1]['condition']['query_operator'] ?? 'and')))
                    : 'and';
                $method = $joiner === 'or' ? 'orWhere' : 'where';

                $group->{$method}(fn (Builder $nested) => $this->applyCondition($nested, $resolved));
            }
        });
    }

    /**
     * build_condition_query + validate_query_operator: mọi lỗi được ném TRƯỚC
     * khi chạm cơ sở dữ liệu.
     *
     * @return list<array{condition: array<string, mixed>, standard: ?array<string, mixed>, custom: ?CustomAttributeDefinition, data_type: ?string}>
     */
    private function validatedConditions(): array
    {
        $lastIndex = count($this->payload) - 1;
        $resolved = [];

        foreach ($this->payload as $index => $condition) {
            $this->validateQueryOperator($condition, $index === $lastIndex);

            $attributeKey = is_string($condition['attribute_key'] ?? null) ? $condition['attribute_key'] : '';
            $operator = is_string($condition['filter_operator'] ?? null) ? $condition['filter_operator'] : '';
            $standard = $this->standardAttributes()[$attributeKey] ?? null;

            if ($standard !== null) {
                $this->assertOperator($attributeKey, $operator, $standard['filter_operators']);
                $this->assertValuesPresent($condition, $attributeKey, $operator);
                $this->assertValueTypes($condition, $attributeKey, $operator, $standard['data_type']);

                $resolved[] = ['condition' => $condition, 'standard' => $standard, 'custom' => null, 'data_type' => null];

                continue;
            }

            $custom = $attributeKey === '' ? null : CustomAttributeDefinition::lookup(
                $this->account->id,
                $this->customAttributeType($condition),
                $attributeKey,
            );
            $dataType = $custom === null
                ? null
                : (FilterKeys::CUSTOM_ATTRIBUTE_DATA_TYPES[$custom->attribute_display_type] ?? null);

            // Bản gốc để rơi vào SQL hỏng khi kiểu hiển thị không lọc được
            // (currency/percent); ở đây trả lỗi 422 như key không tồn tại.
            if ($custom === null || $dataType === null) {
                throw CustomFilterException::invalidAttribute($attributeKey, array_keys($this->standardAttributes()));
            }

            $this->assertOperator($attributeKey, $operator, FilterKeys::CUSTOM_ATTRIBUTE_OPERATORS[$dataType]);
            $this->assertValuesPresent($condition, $attributeKey, $operator);
            $this->assertValueTypes($condition, $attributeKey, $operator, $dataType);

            $resolved[] = ['condition' => $condition, 'standard' => null, 'custom' => $custom, 'data_type' => $dataType];
        }

        return $resolved;
    }

    /** @param array<string, mixed> $condition */
    private function validateQueryOperator(array $condition, bool $isLast): void
    {
        $queryOperator = $condition['query_operator'] ?? null;

        if ($queryOperator === null || trim((string) $queryOperator) === '') {
            return;
        }

        if ($isLast || ! in_array(mb_strtoupper(trim((string) $queryOperator)), ['AND', 'OR'], true)) {
            throw CustomFilterException::invalidQueryOperator();
        }
    }

    /** @param list<string> $allowed */
    private function assertOperator(string $attributeKey, string $operator, array $allowed): void
    {
        if (! in_array($operator, $allowed, true)) {
            throw CustomFilterException::invalidOperator($attributeKey, $allowed);
        }
    }

    /** @param array<string, mixed> $condition */
    private function assertValuesPresent(array $condition, string $attributeKey, string $operator): void
    {
        if (in_array($operator, self::PRESENCE_OPERATORS, true)) {
            return;
        }

        if ($this->values($condition) === []) {
            throw CustomFilterException::invalidValue($attributeKey);
        }
    }

    /** @param array<string, mixed> $condition */
    private function assertValueTypes(array $condition, string $attributeKey, string $operator, string $dataType): void
    {
        if (in_array($operator, self::PRESENCE_OPERATORS, true)) {
            return;
        }

        if ($operator === 'days_before') {
            $days = filter_var($this->values($condition)[0] ?? null, FILTER_VALIDATE_INT);

            if ($days === false || $days < 1 || $days > self::MAX_DAYS_BEFORE) {
                throw CustomFilterException::invalidValue($attributeKey);
            }

            return;
        }

        foreach ($this->values($condition) as $value) {
            match ($dataType) {
                'date' => $this->coerceDate($value, $attributeKey),
                'numeric' => $this->coerceNumber($value, $attributeKey),
                default => null,
            };
        }
    }

    private function coerceDate(mixed $value, string $attributeKey): string
    {
        try {
            return Carbon::parse((string) $value)->toDateString();
        } catch (\Throwable) {
            throw CustomFilterException::invalidValue($attributeKey);
        }
    }

    private function coerceNumber(mixed $value, string $attributeKey): string
    {
        if (! is_numeric($value)) {
            throw CustomFilterException::invalidValue($attributeKey);
        }

        return (string) $value;
    }

    /**
     * @param  Builder<*>  $query
     * @param  array{condition: array<string, mixed>, standard: ?array<string, mixed>, custom: ?CustomAttributeDefinition, data_type: ?string}  $resolved
     */
    private function applyCondition(Builder $query, array $resolved): void
    {
        $resolved['standard'] !== null
            ? $this->applyStandardCondition($query, $resolved['condition'], $resolved['standard'])
            : $this->applyCustomAttributeCondition($query, $resolved['condition'], (string) $resolved['data_type']);
    }

    /**
     * @param  Builder<*>  $query
     * @param  array<string, mixed>  $condition
     * @param  array<string, mixed>  $definition
     */
    private function applyStandardCondition(Builder $query, array $condition, array $definition): void
    {
        $attributeKey = (string) $condition['attribute_key'];
        $operator = (string) $condition['filter_operator'];
        $values = array_map(
            fn (mixed $value) => $this->normalizeValue($attributeKey, $operator, $value),
            $this->values($condition),
        );
        $table = $this->tableName();

        if ($definition['data_type'] === 'labels') {
            $this->applyLabels($query, $operator, $values);

            return;
        }

        if ($definition['data_type'] === 'date') {
            $this->applyDate($query, "{$table}.{$attributeKey}", $attributeKey, $operator, $values[0] ?? null);

            return;
        }

        if ($definition['attribute_type'] === 'additional_attributes') {
            $expression = "{$table}.additional_attributes->>'{$attributeKey}'";

            if ($definition['data_type'] === 'text_case_insensitive') {
                $this->applyExpression($query, "LOWER({$expression})", $operator, $this->lowercase($values));

                return;
            }

            $this->applyExpression($query, $expression, $operator, $values);

            return;
        }

        if ($this->applyEntitySpecificColumn($query, $attributeKey, $operator, $values)) {
            return;
        }

        $definition['data_type'] === 'text_case_insensitive'
            ? $this->applyExpression($query, "LOWER({$table}.{$attributeKey})", $operator, $this->lowercase($values))
            : $this->applyColumn($query, "{$table}.{$attributeKey}", $operator, $values);
    }

    /**
     * build_custom_attr_query: đọc giá trị trong cột jsonb custom_attributes,
     * ép về kiểu của định nghĩa rồi so như một cột thường.
     *
     * @param  Builder<*>  $query
     * @param  array<string, mixed>  $condition
     */
    private function applyCustomAttributeCondition(Builder $query, array $condition, string $dataType): void
    {
        $attributeKey = (string) $condition['attribute_key'];
        $operator = (string) $condition['filter_operator'];
        $values = $this->values($condition);
        $table = $this->tableName();

        $expression = $dataType === 'text'
            ? "LOWER({$table}.custom_attributes->>?)::text"
            : "({$table}.custom_attributes->>?)::{$dataType}";

        if ($dataType === 'text') {
            $values = $this->lowercase($values);
        }

        if ($dataType === 'date' && ! in_array($operator, self::PRESENCE_OPERATORS, true)) {
            $values = [$this->dateBoundary($attributeKey, $operator, $values[0] ?? null)];
            $operator = $operator === 'is_greater_than' ? 'is_greater_than' : 'is_less_than';
        }

        $query->where(function (Builder $group) use ($expression, $attributeKey, $operator, $values, $dataType): void {
            $this->applyExpression($group, $expression, $operator, $values, [$attributeKey]);

            // not_in_custom_attr_query: thuộc tính chưa từng được gán cũng phải
            // lọt lưới của "khác" / "không chứa".
            if (in_array($operator, ['not_equal_to', 'does_not_contain'], true)) {
                $rawExpression = "({$this->tableName()}.custom_attributes->>?)::{$dataType}";
                $group->orWhereRaw("{$rawExpression} IS NULL", [$attributeKey]);
            }
        });
    }

    /**
     * @param  Builder<*>  $query
     * @param  array<int, mixed>  $values
     */
    private function applyLabels(Builder $query, string $operator, array $values): void
    {
        if ($operator === 'is_present') {
            $query->whereHas('labels');

            return;
        }

        if ($operator === 'is_not_present') {
            $query->whereDoesntHave('labels');

            return;
        }

        $matching = fn (Builder $labels) => $labels->whereIn('title', $values);

        $operator === 'equal_to'
            ? $query->whereHas('labels', $matching)
            : $query->whereDoesntHave('labels', $matching);
    }

    /** @param Builder<*> $query */
    private function applyDate(Builder $query, string $column, string $attributeKey, string $operator, mixed $value): void
    {
        $query->whereDate(
            $column,
            $operator === 'is_greater_than' ? '>' : '<',
            $this->dateBoundary($attributeKey, $operator, $value),
        );
    }

    // days_before quy về is_less_than với mốc "hôm nay trừ N ngày".
    private function dateBoundary(string $attributeKey, string $operator, mixed $value): string
    {
        return $operator === 'days_before'
            ? Carbon::today()->subDays((int) $value)->toDateString()
            : $this->coerceDate($value, $attributeKey);
    }

    /**
     * @param  Builder<*>  $query
     * @param  array<int, mixed>  $values
     */
    private function applyColumn(Builder $query, string $column, string $operator, array $values): void
    {
        match ($operator) {
            'is_present' => $query->whereNotNull($column),
            'is_not_present' => $query->whereNull($column),
            'equal_to' => $query->whereIn($column, $values),
            'not_equal_to' => $query->whereNotIn($column, $values),
            default => $this->applyExpression($query, $column, $operator, $values),
        };
    }

    /**
     * Một biểu thức SQL (cột, LOWER(cột), hay jsonb ->> key) so với danh sách
     * giá trị theo operator. `$prefixBindings` là tham số đứng TRƯỚC giá trị
     * trong biểu thức (tên custom attribute).
     *
     * @param  Builder<*>  $query
     * @param  array<int, mixed>  $values
     * @param  array<int, mixed>  $prefixBindings
     */
    private function applyExpression(
        Builder $query,
        string $expression,
        string $operator,
        array $values,
        array $prefixBindings = [],
    ): void {
        if ($operator === 'is_present') {
            $query->whereRaw("{$expression} IS NOT NULL", $prefixBindings);

            return;
        }

        if ($operator === 'is_not_present') {
            $query->whereRaw("{$expression} IS NULL", $prefixBindings);

            return;
        }

        if (in_array($operator, ['equal_to', 'not_equal_to'], true)) {
            $placeholders = implode(', ', array_fill(0, count($values), '?'));
            $comparison = $operator === 'equal_to' ? 'IN' : 'NOT IN';
            $query->whereRaw("{$expression} {$comparison} ({$placeholders})", [...$prefixBindings, ...$values]);

            return;
        }

        if (in_array($operator, ['is_greater_than', 'is_less_than'], true)) {
            $comparison = $operator === 'is_greater_than' ? '>' : '<';
            $query->whereRaw("{$expression} {$comparison} ?", [...$prefixBindings, $values[0] ?? null]);

            return;
        }

        // ILIKE ANY / NOT ILIKE ALL của bản gốc: contains khớp bất kỳ giá trị nào,
        // does_not_contain phải trượt tất cả.
        $patterns = array_map(
            fn (mixed $value) => $operator === 'starts_with'
                ? trim((string) $value).'%'
                : '%'.trim((string) $value).'%',
            $values,
        );
        $negated = $operator === 'does_not_contain';
        $comparison = $negated ? 'NOT ILIKE ALL' : 'ILIKE ANY';
        $placeholders = implode(', ', array_fill(0, count($patterns), '?'));

        $query->whereRaw(
            "{$expression} {$comparison} (ARRAY[{$placeholders}])",
            [...$prefixBindings, ...$patterns],
        );
    }

    /**
     * @param  array<string, mixed>  $condition
     * @return array<int, mixed>
     */
    private function values(array $condition): array
    {
        $values = $condition['values'] ?? [];

        if (! is_array($values)) {
            $values = [$values];
        }

        return array_values(array_filter($values, fn (mixed $value) => $value !== null && $value !== ''));
    }

    /**
     * @param  array<int, mixed>  $values
     * @return array<int, mixed>
     */
    private function lowercase(array $values): array
    {
        return array_map(
            fn (mixed $value) => is_string($value) ? mb_strtolower($value) : $value,
            $values,
        );
    }

    /** @param array<string, mixed> $condition */
    private function customAttributeType(array $condition): string
    {
        $type = $condition['custom_attribute_type'] ?? null;

        return is_string($type) && $type !== '' ? $type : $this->customAttributeModel();
    }
}
