<?php

namespace App\Http\Resources;

use App\Http\Resources\Integrations\HookResource;
use App\Models\Account;
use App\Models\Integrations\Hook;
use App\Support\Integrations\App;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_app.json.jbuilder. Khối cấu hình thô (logo, schema
// form, action…) chỉ trả cho administrator, đúng như bản gốc.
class IntegrationAppResource extends JsonResource
{
    public function __construct(
        App $resource,
        private readonly Account $account,
        private readonly bool $administrator,
        private readonly ?Collection $accountHooks = null,
    ) {
        parent::__construct($resource);
    }

    public function toArray(Request $request): array
    {
        /** @var App $app */
        $app = $this->resource;

        return [
            'id' => $app->id(),
            'name' => $app->name(),
            'description' => $app->description(),
            'short_description' => $app->shortDescription(),
            'enabled' => $app->isEnabled($this->account),
            ...($this->administrator ? [
                ...$app->adminParams(),
                'action' => $app->action(),
                'button' => $app->action(),
            ] : []),
            'hooks' => HookResource::collectionFor($this->hooksOf($app), $this->administrator),
        ];
    }

    /** @param iterable<App> $apps */
    public static function collectionFor(iterable $apps, Account $account, bool $administrator): array
    {
        // Một lượt truy vấn cho cả danh mục thay vì mỗi app một lượt.
        $accountHooks = $account->hooks()->with('inbox')->get();

        return collect($apps)
            ->map(fn (App $app) => (new self($app, $account, $administrator, $accountHooks))->toArray(request()))
            ->values()
            ->all();
    }

    /** @return Collection<int, Hook> */
    private function hooksOf(App $app): Collection
    {
        return ($this->accountHooks ?? $this->account->hooks()->with('inbox')->get())
            ->where('app_id', $app->id())
            ->values();
    }
}
