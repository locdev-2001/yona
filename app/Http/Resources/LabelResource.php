<?php

namespace App\Http\Resources;

use App\Models\Label;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/accounts/labels/{index,show,create,update}.json.jbuilder —
// cả bốn view cùng 5 khóa, khác nhau chỉ ở chỗ index bọc trong `payload`.
class LabelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Label $label */
        $label = $this->resource;

        return [
            'id' => $label->id,
            'title' => $label->title,
            'description' => $label->description,
            'color' => $label->color,
            'show_on_sidebar' => $label->show_on_sidebar,
        ];
    }
}
