<?php

namespace App\Models\Concerns;

use App\Models\Label;
use App\Models\Tagging;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// Port từ refs/chatwoot/app/models/concerns/labelable.rb — chỗ duy nhất biết
// cách gắn/gỡ nhãn cho MỌI model (Conversation, Contact). Bản gốc uỷ thác cho
// gem acts_as_taggable_on; ở đây là bảng `taggings` khóa ngoại thật, nên chỉ
// gắn được nhãn đã tồn tại trong account (title lạ bị bỏ qua).
// Model muốn phản ứng theo thay đổi (cache, event, activity) thì override
// labelListChanged().
trait Labelable
{
    /** @return MorphToMany<Label, $this> */
    public function labels(): MorphToMany
    {
        return $this->morphToMany(Label::class, 'taggable', 'taggings', 'taggable_id', 'label_id')
            ->withoutGlobalScope(Label::ORDER_SCOPE)
            ->orderBy('taggings.id');
    }

    /** @return array<int, string> */
    public function labelList(): array
    {
        return $this->labels()->pluck('title')->all();
    }

    /** @param array<int, string>|string|null $labels */
    public function updateLabels(array|string|null $labels = null): bool
    {
        return $this->syncLabels($this->parseLabelList($labels));
    }

    /** @param array<int, string>|string|null $newLabels */
    public function addLabels(array|string|null $newLabels = null): bool
    {
        $incoming = $this->parseLabelList($newLabels);

        if ($incoming === []) {
            return false;
        }

        return $this->syncLabels([...$this->labelList(), ...$incoming]);
    }

    /** @param array<int, string>|string|null $labels */
    public function removeLabels(array|string|null $labels = null): bool
    {
        $removed = $this->resolveLabels($this->parseLabelList($labels))->pluck('title')->all();

        if ($removed === []) {
            return false;
        }

        return $this->syncLabels(array_values(array_diff($this->labelList(), $removed)));
    }

    /**
     * @param  array<int, string>  $previous
     * @param  array<int, string>  $current
     */
    protected function labelListChanged(array $previous, array $current): void {}

    /** @param array<int, string> $titles */
    private function syncLabels(array $titles): bool
    {
        $previous = $this->labelList();
        $labelIds = $this->resolveLabels($titles)->pluck('id')->all();

        DB::transaction(function () use ($labelIds) {
            $this->taggingsQuery()
                ->when($labelIds !== [], fn (Builder $query) => $query->whereNotIn('label_id', $labelIds))
                ->delete();

            $existingIds = $this->taggingsQuery()->pluck('label_id')->all();

            foreach (array_diff($labelIds, $existingIds) as $labelId) {
                Tagging::query()->create([
                    'account_id' => $this->account_id,
                    'label_id' => $labelId,
                    'taggable_type' => $this->getMorphClass(),
                    'taggable_id' => $this->getKey(),
                ]);
            }
        });

        $current = $this->labelList();

        if ($current !== $previous) {
            $this->labelListChanged($previous, $current);
        }

        return true;
    }

    /**
     * @param  array<int, string>  $titles
     * @return Collection<int, Label>
     */
    private function resolveLabels(array $titles): Collection
    {
        $normalized = collect($titles)
            ->map(fn (string $title) => Label::normalizeTitle($title))
            ->unique()
            ->values();

        if ($normalized->isEmpty()) {
            return collect();
        }

        $labels = Label::query()
            ->where('account_id', $this->account_id)
            ->whereIn('title', $normalized->all())
            ->get()
            ->keyBy('title');

        return $normalized->map(fn (string $title) => $labels->get($title))->filter()->values();
    }

    // ActsAsTaggableOn.default_parser: nhận mảng, hoặc chuỗi ngăn cách bằng dấu phẩy.
    /**
     * @param  array<int, string>|string|null  $labels
     * @return array<int, string>
     */
    private function parseLabelList(array|string|null $labels): array
    {
        return collect(is_string($labels) ? explode(',', $labels) : ($labels ?? []))
            ->map(fn ($title) => trim((string) $title))
            ->filter()
            ->values()
            ->all();
    }

    /** @return Builder<Tagging> */
    private function taggingsQuery(): Builder
    {
        return Tagging::query()
            ->where('taggable_type', $this->getMorphClass())
            ->where('taggable_id', $this->getKey());
    }
}
