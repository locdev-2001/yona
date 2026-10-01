<?php

namespace App\Support;

use App\Models\Account;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Auth;

/**
 * Account, Contact và User nạp một lần cho mỗi request/job rồi dùng chung: mọi
 * `$model->account`, `$conversation->assignee`, `$message->sender` cùng id trỏ
 * về một instance, kể cả avatar đã nạp của nó. Xoá khi request/job kết thúc và
 * khi một instance khác của cùng bản ghi được lưu.
 */
final class SharedModels
{
    private const SHAREABLE = [Account::class, Contact::class, User::class];

    /** @var array<class-string, array<int|string, Model>> */
    private array $models = [];

    public function remember(Model $model): void
    {
        if (in_array($model::class, self::SHAREABLE, true) && $model->exists) {
            $this->models[$model::class][$model->getKey()] = $model;
        }
    }

    /** @param class-string<Model> $class */
    public function find(string $class, int|string $id): ?Model
    {
        if (isset($this->models[$class][$id])) {
            return $this->models[$class][$id];
        }

        $model = $this->authenticated($class, $id) ?? $class::query()->find($id);

        if ($model !== null) {
            $this->models[$class][$id] = $model;
        }

        return $model;
    }

    public function forgetUnless(Model $saved): void
    {
        $cached = $this->models[$saved::class][$saved->getKey()] ?? null;

        if ($cached !== null && $cached !== $saved) {
            unset($this->models[$saved::class][$saved->getKey()]);
        }
    }

    public function flush(): void
    {
        $this->models = [];
    }

    /** Bản dùng chung cho quan hệ belongsTo/morphTo tới Account/User, null nếu quan hệ không thuộc diện này. */
    public static function forRelation(Model $parent, string $method): ?Model
    {
        $relation = $parent->{$method}();

        if (! $relation instanceof BelongsTo || count($relation->getBaseQuery()->wheres) !== 1) {
            return null;
        }

        $class = $relation instanceof MorphTo
            ? Relation::getMorphedModel((string) $parent->{$relation->getMorphType()}) ?? $parent->{$relation->getMorphType()}
            : $relation->getRelated()::class;
        $id = $parent->{$relation->getForeignKeyName()};

        if ($id === null || ! in_array($class, self::SHAREABLE, true)
            || ($relation->getOwnerKeyName() ?? 'id') !== (new $class)->getKeyName()) {
            return null;
        }

        return app(self::class)->find($class, $id);
    }

    private function authenticated(string $class, int|string $id): ?Model
    {
        if ($class !== User::class || ! Auth::hasUser()) {
            return null;
        }

        $user = Auth::user();

        return $user instanceof User && (string) $user->getKey() === (string) $id ? $user : null;
    }
}
