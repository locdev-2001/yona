<?php

namespace App\Services\Admin\Operations;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

// Trình duyệt dữ liệu chỉ đọc của console. Chỉ dựng SELECT bằng query builder,
// tên bảng/cột lấy từ catalog của Postgres (không bao giờ từ chuỗi người dùng),
// cột bí mật và nội dung khách không rời DB: SELECT thay bằng cờ "có giá trị".
final class DataBrowser
{
    public const PER_PAGE = 50;

    public const MAX_TEXT_LENGTH = 300;

    public const PERSONAL_MASK = '[nội dung khách]';

    // Bảng chỉ có phiên, token đặt lại mật khẩu, cache và payload job đã tuần tự hoá
    // (có thể mang nguyên tin nhắn) — không mở trong console.
    private const HIDDEN_TABLES = ['sessions', 'password_reset_tokens', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs'];

    // Dưới ngưỡng ước tính này thì đếm thật; lớn hơn dùng thống kê của Postgres.
    private const EXACT_COUNT_THRESHOLD = 50000;

    private const NUMERIC_TYPES = ['smallint', 'integer', 'bigint', 'numeric', 'real', 'double precision'];

    private const JSON_TYPES = ['json', 'jsonb'];

    private const ENTRY_KEY_COLUMNS = ['name', 'key'];

    private const ENTRY_VALUE_COLUMNS = ['value', 'serialized_value'];

    /** @var array<string, list<array<string, mixed>>> */
    private array $columnCache = [];

    /** @return list<array{name: string, rows: int, approximate: bool, bytes: int}> */
    public function tables(): array
    {
        $rows = DB::select(<<<'SQL'
            select c.relname as name, c.reltuples::bigint as estimate, pg_total_relation_size(c.oid) as bytes
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = current_schema() and c.relkind in ('r', 'p') and not c.relispartition
            order by c.relname
        SQL);

        $tables = [];
        foreach ($rows as $row) {
            if ($this->isHidden($row->name)) {
                continue;
            }

            $estimate = (int) $row->estimate;
            $exact = $estimate < self::EXACT_COUNT_THRESHOLD;

            $tables[] = [
                'name' => $row->name,
                'rows' => $exact ? DB::table($row->name)->count() : $estimate,
                'approximate' => ! $exact,
                'bytes' => (int) $row->bytes,
            ];
        }

        return $tables;
    }

    public function exists(string $table): bool
    {
        return ! $this->isHidden($table) && $this->columns($table) !== [];
    }

    /** @return list<array{name: string, type: string, masked: ?string, filterable: bool, sortable: bool}> */
    public function columns(string $table): array
    {
        return $this->columnCache[$table] ??= array_map(function (object $column) use ($table) {
            $masked = match (true) {
                SensitiveFields::isPersonalContent($table, $column->name) => 'personal',
                SensitiveFields::isSensitive($column->name) => 'secret',
                default => null,
            };
            $searchable = $masked === null && $column->type !== 'bytea';

            return [
                'name' => $column->name,
                'type' => $column->type,
                'masked' => $masked,
                'filterable' => $searchable,
                'sortable' => $searchable && ! in_array($column->type, self::JSON_TYPES, true),
            ];
        }, DB::select(
            'select column_name as name, data_type as type from information_schema.columns where table_schema = current_schema() and table_name = ? order by ordinal_position',
            [$table],
        ));
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array{columns: list<array<string, mixed>>, rows: list<array<string, mixed>>, page: int, hasMore: bool, sort: string, direction: string, filters: array<string, string>}
     */
    public function browse(string $table, array $filters, ?string $sort, string $direction, int $page): array
    {
        $columns = $this->columns($table);
        $byName = array_column($columns, null, 'name');
        $page = max(1, $page);
        $direction = $direction === 'asc' ? 'asc' : 'desc';

        if ($sort === null || ! ($byName[$sort]['sortable'] ?? false)) {
            $sort = isset($byName['id']) ? 'id' : (collect($columns)->firstWhere('sortable', true)['name'] ?? null);
        }

        $query = DB::table($table)->select($this->selectList($columns));
        $appliedFilters = $this->applyFilters($query, $byName, $filters);

        if ($sort !== null) {
            $query->orderBy($sort, $direction);
        }

        $records = $query->forPage($page, self::PER_PAGE + 1)->get();
        $hasMore = $records->count() > self::PER_PAGE;

        return [
            'columns' => $columns,
            'rows' => $records->take(self::PER_PAGE)->map(fn (object $record) => $this->presentRow((array) $record, $byName))->values()->all(),
            'page' => $page,
            'hasMore' => $hasMore,
            'sort' => (string) $sort,
            'direction' => $direction,
            'filters' => $appliedFilters,
        ];
    }

    private function isHidden(string $table): bool
    {
        return in_array($table, self::HIDDEN_TABLES, true);
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     * @return list<mixed>
     */
    private function selectList(array $columns): array
    {
        $grammar = DB::connection()->getQueryGrammar();

        return array_map(
            fn (array $column) => $column['masked'] === null
                ? $column['name']
                : DB::raw('('.$grammar->wrap($column['name']).' is not null) as '.$grammar->wrap($column['name'])),
            $columns,
        );
    }

    /**
     * @param  array<string, array<string, mixed>>  $byName
     * @param  array<string, mixed>  $filters
     * @return array<string, string>
     */
    private function applyFilters(Builder $query, array $byName, array $filters): array
    {
        $grammar = DB::connection()->getQueryGrammar();
        $applied = [];

        foreach ($filters as $name => $value) {
            $value = is_scalar($value) ? trim((string) $value) : '';
            $column = $byName[$name] ?? null;

            if ($value === '' || $column === null || ! $column['filterable']) {
                continue;
            }

            if ($value === 'null') {
                $query->whereNull($name);
            } elseif (in_array($column['type'], self::NUMERIC_TYPES, true)) {
                if (! is_numeric($value)) {
                    continue;
                }
                $query->where($name, $value);
            } elseif ($column['type'] === 'boolean') {
                $query->where($name, filter_var($value, FILTER_VALIDATE_BOOLEAN));
            } else {
                $query->whereRaw('cast('.$grammar->wrap($name).' as text) ilike ?', ['%'.self::escapeLike($value).'%']);
            }

            $applied[$name] = $value;
        }

        return $applied;
    }

    /**
     * @param  array<string, mixed>  $record
     * @param  array<string, array<string, mixed>>  $byName
     * @return array<string, mixed>
     */
    private function presentRow(array $record, array $byName): array
    {
        $row = [];
        $secretEntry = $this->isSecretEntry($record);

        foreach ($record as $name => $value) {
            $column = $byName[$name] ?? ['masked' => null, 'type' => 'text'];
            $row[$name] = match (true) {
                $secretEntry && in_array($name, self::ENTRY_VALUE_COLUMNS, true) => $value === null ? null : SensitiveFields::MASK,
                $column['masked'] === 'personal' => $value ? self::PERSONAL_MASK : null,
                $column['masked'] === 'secret' => $value ? SensitiveFields::MASK : null,
                default => $this->presentValue($value, $column['type']),
            };
        }

        return $row;
    }

    // Bảng dạng khoá–giá trị (installation_configs: name = MAILER_SMTP_PASSWORD…):
    // tên cột không lộ gì, tên khoá trong dòng mới cho biết giá trị là bí mật.
    /** @param  array<string, mixed>  $record */
    private function isSecretEntry(array $record): bool
    {
        foreach (self::ENTRY_KEY_COLUMNS as $column) {
            if (is_string($record[$column] ?? null) && SensitiveFields::isSensitive($record[$column])) {
                return true;
            }
        }

        return false;
    }

    private function presentValue(mixed $value, string $type): mixed
    {
        if ($value === null || is_bool($value) || is_int($value) || is_float($value)) {
            return $value;
        }

        if (is_resource($value) || $type === 'bytea') {
            return '[binary]';
        }

        $text = (string) $value;

        if (SensitiveFields::looksEncrypted($text)) {
            return SensitiveFields::MASK;
        }

        if (in_array($type, self::JSON_TYPES, true)) {
            $decoded = json_decode($text, true);
            if (is_array($decoded)) {
                $text = (string) json_encode(SensitiveFields::maskTree($decoded), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        }

        return mb_strlen($text) > self::MAX_TEXT_LENGTH ? mb_substr($text, 0, self::MAX_TEXT_LENGTH).'…' : $text;
    }

    public static function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
