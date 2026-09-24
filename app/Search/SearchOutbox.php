<?php

namespace App\Search;

use App\Jobs\Search\ProcessSearchOutboxJob;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Hàng chờ thay đổi cần đẩy sang chỉ mục tìm kiếm. Chỉ ghi khi engine hiện tại
 * giữ chỉ mục riêng — với engine tìm thẳng trong PostgreSQL thì bảng luôn rỗng,
 * không tốn thêm lượt ghi nào trên luồng tin.
 */
final class SearchOutbox
{
    public const TABLE = 'search_outbox';

    public const OPERATION_UPSERT = 'upsert';

    public const OPERATION_DELETE = 'delete';

    public function __construct(private readonly SearchEngine $engine) {}

    public function enabled(): bool
    {
        return $this->engine->keepsSeparateIndex();
    }

    public function recordUpsert(Model $model): void
    {
        $this->record($model, self::OPERATION_UPSERT);
    }

    public function recordRemoval(Model $model): void
    {
        $this->record($model, self::OPERATION_DELETE);
    }

    /**
     * Xử lý một lô dòng cũ nhất: thao tác cuối của mỗi tài liệu thắng, gọi engine
     * theo từng loại rồi mới xoá dòng. Engine ném lỗi thì dòng còn nguyên cho lần
     * thử sau.
     *
     * @return int số dòng đã xử lý
     */
    public function processBatch(int $limit): int
    {
        $rows = DB::table(self::TABLE)->orderBy('id')->limit($limit)->get();

        if ($rows->isEmpty()) {
            return 0;
        }

        $latestPerDocument = $rows->keyBy(fn (object $row) => $row->document_type.':'.$row->document_id);

        foreach ($latestPerDocument->groupBy('document_type') as $documentType => $documentRows) {
            $target = SearchTarget::tryFrom((string) $documentType);

            if ($target === null) {
                continue;
            }

            [$removals, $upserts] = $documentRows->partition(fn (object $row) => $row->operation === self::OPERATION_DELETE);

            if ($upserts->isNotEmpty()) {
                $this->engine->index($target, $upserts->map(fn (object $row) => (int) $row->document_id)->values()->all());
            }

            if ($removals->isNotEmpty()) {
                $this->engine->remove($target, $removals->map(fn (object $row) => (int) $row->document_id)->values()->all());
            }
        }

        DB::table(self::TABLE)->whereIn('id', $rows->pluck('id'))->delete();

        return $rows->count();
    }

    // Đổi về engine không giữ chỉ mục riêng thì các dòng còn tồn vô nghĩa.
    public function discardPending(): void
    {
        DB::table(self::TABLE)->delete();
    }

    /** @return array{pending: int, oldest_age_seconds: int|null} */
    public function backlog(): array
    {
        $summary = DB::table(self::TABLE)->selectRaw('count(*) as pending, min(created_at) as oldest_created_at')->first();
        $oldestCreatedAt = $summary?->oldest_created_at;

        return [
            'pending' => (int) ($summary->pending ?? 0),
            'oldest_age_seconds' => $oldestCreatedAt === null
                ? null
                : (int) CarbonImmutable::parse($oldestCreatedAt)->diffInSeconds(now(), absolute: true),
        ];
    }

    private function record(Model $model, string $operation): void
    {
        if (! $this->enabled() || ! $model->isSearchDocument()) {
            return;
        }

        // Cùng kết nối với model: nằm trong transaction của thay đổi.
        $model->getConnection()->table(self::TABLE)->insert([
            'account_id' => $model->getAttribute('account_id'),
            'document_type' => SearchTarget::forModel($model)->value,
            'document_id' => $model->getKey(),
            'operation' => $operation,
        ]);

        ProcessSearchOutboxJob::dispatchSoon();
    }
}
