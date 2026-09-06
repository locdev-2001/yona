<?php

namespace App\Support\SuperAdmin;

use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

// Port từ tầng Field của Administrate: biến một thuộc tính của bản ghi thành
// khối JSON mà trang React vẽ ra. Mỗi kiểu field xuất hiện đúng một lần ở đây.
class FieldPresenter
{
    public function __construct(private readonly DashboardRegistry $registry) {}

    /** @return array{name: string, label: string, type: string, html_class: string, value: mixed} */
    public function present(Dashboard $dashboard, Model $record, string $attribute, bool $withNested = true): array
    {
        $type = $dashboard->attributeTypes()[$attribute] ?? 'string';

        return [
            'name' => $attribute,
            'label' => Str::ucfirst(str_replace('_', ' ', $attribute)),
            'type' => $type,
            'html_class' => str_replace('_', '-', $type),
            'value' => $this->value($dashboard, $record, $attribute, $type, $withNested),
        ];
    }

    public function url(Model $record): ?string
    {
        $dashboard = $this->registry->forModel($record);

        return $dashboard === null ? null : "/super_admin/{$dashboard->resourceName()}/{$record->getKey()}";
    }

    public function label(Model $record): string
    {
        return $this->registry->forModel($record)?->displayResource($record) ?? class_basename($record).' #'.$record->getKey();
    }

    private function value(Dashboard $dashboard, Model $record, string $attribute, string $type, bool $withNested): mixed
    {
        $raw = $dashboard->attributeValue($record, $attribute);

        return match ($type) {
            'date_time', 'confirmed_at_field' => $this->dateTime($raw),
            'has_many' => $withNested ? $this->hasMany($raw) : null,
            'has_one' => $withNested ? $this->hasOne($raw) : null,
            'belongs_to', 'belongs_to_search', 'polymorphic' => $this->association($raw),
            'password' => null,
            default => $raw,
        };
    }

    private function dateTime(mixed $value): ?string
    {
        if (blank($value)) {
            return null;
        }

        // Định dạng `Mon, 31 Aug 2026 06:58:21 +0000` của Administrate.
        return Carbon::parse($value)->utc()->format('D, d M Y H:i:s O');
    }

    private function association(mixed $value): ?array
    {
        if (! $value instanceof Model) {
            return null;
        }

        return ['label' => $this->label($value), 'url' => $this->url($value)];
    }

    private function hasOne(mixed $value): ?array
    {
        if (! $value instanceof Model) {
            return null;
        }

        $dashboard = $this->registry->forModel($value);

        return [
            'label' => class_basename($value).' #'.$value->getKey(),
            'url' => $this->url($value),
            'fields' => $dashboard === null ? [] : array_map(
                fn (string $attribute) => $this->present($dashboard, $value, $attribute, false),
                $dashboard->showPageAttributes(),
            ),
        ];
    }

    private function hasMany(mixed $value): array
    {
        $records = $value instanceof EloquentCollection ? $value : EloquentCollection::make();
        $dashboard = $records->isEmpty() ? null : $this->registry->forModel($records->first());

        if ($dashboard === null) {
            return ['columns' => [], 'rows' => []];
        }

        $attributes = $dashboard->collectionAttributes();

        return [
            'columns' => array_map(fn (string $attribute) => [
                'name' => $attribute,
                'label' => Str::ucfirst(str_replace('_', ' ', $attribute)),
                'html_class' => str_replace('_', '-', $dashboard->attributeTypes()[$attribute] ?? 'string'),
            ], $attributes),
            'rows' => $records->map(fn (Model $row) => [
                'url' => $this->url($row),
                'destroy_url' => $this->url($row),
                'cells' => array_map(fn (string $attribute) => $this->present($dashboard, $row, $attribute, false), $attributes),
            ])->values()->all(),
        ];
    }
}
