<?php

namespace App\Http\Resources\Search;

use App\Http\Resources\MessageResource;
use App\Models\Attachment;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Một tệp khớp từ khoá: dữ liệu đính kèm như mọi nơi khác (apiData), kèm tên
// tệp hiển thị và tin chứa nó để giao diện mở đúng hội thoại, đúng tin.
class SearchFileResource extends JsonResource
{
    /** @param iterable<Attachment> $attachments */
    public static function collectionFor(iterable $attachments): array
    {
        return collect($attachments)
            ->map(fn (Attachment $attachment) => (new self($attachment))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Attachment $attachment */
        $attachment = $this->resource;
        $message = $attachment->attachable;

        return [
            ...$attachment->apiData(),
            'file_name' => $attachment->displayName(),
            'message' => $message instanceof Message ? (new MessageResource($message))->toArray($request) : null,
        ];
    }
}
