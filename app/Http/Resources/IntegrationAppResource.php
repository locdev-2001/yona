<?php

namespace App\Http\Resources;

use App\Models\Account;
use App\Support\Integrations\App;
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
            // Bảng hooks thuộc nhóm F — chưa có hook nào để trả.
            'hooks' => [],
        ];
    }

    /** @param iterable<App> $apps */
    public static function collectionFor(iterable $apps, Account $account, bool $administrator): array
    {
        return collect($apps)
            ->map(fn (App $app) => (new self($app, $account, $administrator))->toArray(request()))
            ->values()
            ->all();
    }
}
