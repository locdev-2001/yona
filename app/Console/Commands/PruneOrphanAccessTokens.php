<?php

namespace App\Console\Commands;

use App\Models\AccessToken;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Collection;

/**
 * Xoá access token mà chủ sở hữu (user, bot, platform app…) đã không còn —
 * dữ liệu sót lại từ trước khi token bị xoá theo chủ. Loại chủ đọc từ chính
 * bảng access_tokens nên không phải sửa lệnh khi có loại chủ mới.
 *
 * Chạy lại được nhiều lần: lượt sau không còn gì để xoá.
 */
class PruneOrphanAccessTokens extends Command
{
    protected $signature = 'access-tokens:prune-orphans
        {--dry-run : Chỉ đếm token mồ côi theo loại chủ, không xoá gì}';

    protected $description = 'Xoá access token của chủ sở hữu đã bị xoá';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $total = 0;

        foreach ($this->ownerTypes() as $ownerType) {
            $owner = $this->ownerModel($ownerType);

            if ($owner === null) {
                $this->components->warn('Bỏ qua loại chủ không nhận ra: '.($ownerType ?? '(trống)'));

                continue;
            }

            $orphans = $this->orphansOf($ownerType, $owner);
            $count = $dryRun ? $orphans->count() : $orphans->delete();
            $this->line(sprintf('  %s: %d token mồ côi', $ownerType, $count));
            $total += $count;
        }

        $this->components->info($dryRun
            ? "Thử chạy: $total token mồ côi sẽ bị xoá."
            : "Đã xoá $total token mồ côi.");

        return self::SUCCESS;
    }

    /** @return Collection<int, string|null> */
    private function ownerTypes(): Collection
    {
        return AccessToken::query()->distinct()->orderBy('owner_type')->pluck('owner_type');
    }

    private function ownerModel(?string $ownerType): ?Model
    {
        $class = $ownerType === null ? null : (Relation::getMorphedModel($ownerType) ?? $ownerType);

        return $class !== null && is_subclass_of($class, Model::class) ? new $class : null;
    }

    /** @return Builder<AccessToken> */
    private function orphansOf(string $ownerType, Model $owner): Builder
    {
        return AccessToken::query()
            ->where('owner_type', $ownerType)
            ->whereNotExists(fn (QueryBuilder $query) => $query
                ->selectRaw('1')
                ->from($owner->getTable())
                ->whereColumn($owner->getQualifiedKeyName(), (new AccessToken)->qualifyColumn('owner_id')));
    }
}
