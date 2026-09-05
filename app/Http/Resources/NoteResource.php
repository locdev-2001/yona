<?php

namespace App\Http\Resources;

use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_note.json.jbuilder.
/** @mixin Note */
class NoteResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $payload = [
            'id' => $this->id,
            'content' => $this->content,
            'account_id' => $this->account_id,
            'contact_id' => $this->contact_id,
            'created_at' => $this->created_at?->timestamp,
            'updated_at' => $this->updated_at?->timestamp,
        ];

        if ($this->user !== null) {
            $payload['user'] = AgentResource::forAccount([$this->user], $this->account)[0];
        }

        return $payload;
    }
}
