<?php

namespace App\Support\SuperAdmin;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

// Mô tả duy nhất một tài nguyên — kiểu từng thuộc tính, cột nào lên bảng, trường nào
// lên trang xem/biểu mẫu, bộ lọc nào hiện trong ô select. Controller và trang
// React đều đọc từ đây nên thêm cột chỉ sửa một chỗ.
abstract class Dashboard
{
    /** @return class-string<Model> */
    abstract public function modelClass(): string;

    /** @return array<string, string> tên thuộc tính => kiểu field */
    abstract public function attributeTypes(): array;

    /** @return list<string> */
    abstract public function collectionAttributes(): array;

    /** @return list<string> */
    abstract public function showPageAttributes(): array;

    /** @return list<string> */
    abstract public function formAttributes(): array;

    /** @return array<string, array<int, mixed>> */
    public function validationRules(Model $record): array
    {
        return [];
    }

    /** @return array<string, callable(Builder): Builder> */
    public function collectionFilters(): array
    {
        return [];
    }

    /** @return list<string> */
    public function searchableAttributes(): array
    {
        return [];
    }

    /** Tên số nhiều dùng cho URL: /admin/<resourceName>. */
    public function resourceName(): string
    {
        return Str::kebab(Str::pluralStudly(class_basename($this->modelClass())));
    }

    /** Tên số ít dùng cho tham số form + tiêu đề nút. */
    public function singularName(): string
    {
        return Str::snake(class_basename($this->modelClass()));
    }

    public function displayName(): string
    {
        return Str::headline(Str::pluralStudly(class_basename($this->modelClass())));
    }

    public function displayResource(Model $record): string
    {
        return class_basename($record).' #'.$record->getKey();
    }

    /** Điều kiện hiện của một trường biểu mẫu (['field' => …, 'value' => …]). */
    public function formFieldDependency(string $attribute): ?array
    {
        return null;
    }

    /** Nhãn riêng của một trường biểu mẫu; null thì suy ra từ tên thuộc tính. */
    public function formFieldLabel(string $attribute): ?string
    {
        return null;
    }

    /** Tuỳ chọn cho field kiểu select (name => list<string>). */
    public function selectOptions(string $attribute): array
    {
        return [];
    }

    /**
     * Hành động khả dụng của tài nguyên (Administrate suy ra từ `resources ...,
     * only: [...]` trong routes.rb). Quyết định nút New / cột Edit / Destroy.
     *
     * @return list<string>
     */
    public function availableActions(): array
    {
        return ['index', 'show', 'new', 'edit', 'destroy'];
    }

    /** Giá trị thô của một thuộc tính; dashboard con đè cho các field tính toán. */
    public function attributeValue(Model $record, string $attribute): mixed
    {
        return $record->{$attribute};
    }

    public function newRecord(): Model
    {
        $class = $this->modelClass();

        return new $class;
    }

    public function baseQuery(): Builder
    {
        return $this->modelClass()::query();
    }
}
