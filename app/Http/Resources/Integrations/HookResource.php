<?php

namespace App\Http\Resources\Integrations;

use App\Models\Integrations\Hook;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_hook.json.jbuilder — khối settings/reference_id chỉ trả
// cho administrator, và settings đã lọc theo visible_properties của app.
class HookResource extends JsonResource
{
    public function __construct(Hook $resource, private readonly bool $administrator)
    {
        parent::__construct($resource);
    }

    public function toArray(Request $request): array
    {
        /** @var Hook $hook */
        $hook = $this->resource;

        return [
            'id' => $hook->id,
            'app_id' => $hook->app_id,
            'status' => $hook->isEnabled(),
            'inbox' => $hook->inbox === null ? null : ['id' => $hook->inbox->id, 'name' => $hook->inbox->name],
            'account_id' => $hook->account_id,
            'hook_type' => $hook->hookTypeName(),
            ...($this->administrator ? [
                'settings' => self::visibleSettings($hook),
                'reference_id' => $hook->reference_id,
            ] : []),
        ];
    }

    /** @param iterable<Hook> $hooks */
    public static function collectionFor(iterable $hooks, bool $administrator): array
    {
        return collect($hooks)
            ->map(fn (Hook $hook) => (new self($hook, $administrator))->toArray(request()))
            ->values()
            ->all();
    }

    // jbuilder trả object rỗng `{}` khi không có thuộc tính nào hiện — mảng rỗng
    // của PHP sẽ thành `[]` nên phải ép về object.
    private static function visibleSettings(Hook $hook): array|object
    {
        $visibleProperties = $hook->app()?->params['visible_properties'] ?? [];

        $visible = collect($hook->settings ?? [])
            ->filter(fn (mixed $value, string $key) => in_array($key, $visibleProperties, true))
            ->all();

        return $visible === [] ? (object) [] : $visible;
    }
}
