<?php

namespace App\Http\Resources;

use App\Models\Account;
use App\Models\Macro;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_macro.json.jbuilder — created_by/updated_by dùng lại
// partial agent, `files` chỉ xuất hiện khi macro có tệp đính kèm.
class MacroResource extends JsonResource
{
    public function __construct(Macro $resource, private readonly Account $account)
    {
        parent::__construct($resource);
    }

    /** @param iterable<Macro> $macros */
    public static function forAccount(iterable $macros, Account $account): array
    {
        return collect($macros)
            ->map(fn (Macro $macro) => (new self($macro, $account))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Macro $macro */
        $macro = $this->resource;

        $payload = [
            'id' => $macro->id,
            'name' => $macro->name,
            'visibility' => $macro->visibility,
        ];

        if ($macro->createdBy instanceof User) {
            $payload['created_by'] = (new AgentResource($macro->createdBy, $this->account))->toArray($request);
        }

        if ($macro->updatedBy instanceof User) {
            $payload['updated_by'] = (new AgentResource($macro->updatedBy, $this->account))->toArray($request);
        }

        $payload['account_id'] = $macro->account_id;
        $payload['actions'] = $macro->actions ?? [];

        $files = $macro->fileBaseData();
        if ($files !== []) {
            $payload['files'] = $files;
        }

        return $payload;
    }
}
