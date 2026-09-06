<?php

namespace App\Http\Resources;

use App\Models\CustomAttributeDefinition;
use App\Support\RailsTimestamp;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_custom_attribute_definition.json.jbuilder — giữ nguyên
// thứ tự khóa của bản gốc.
class CustomAttributeDefinitionResource extends JsonResource
{
    /**
     * @param  iterable<CustomAttributeDefinition>  $definitions
     * @return list<array<string, mixed>>
     */
    public static function collectionFor(iterable $definitions): array
    {
        return collect($definitions)
            ->map(fn (CustomAttributeDefinition $definition) => (new self($definition))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var CustomAttributeDefinition $definition */
        $definition = $this->resource;

        return [
            'id' => $definition->id,
            'attribute_display_name' => $definition->attribute_display_name,
            'attribute_display_type' => $definition->attribute_display_type,
            'attribute_description' => $definition->attribute_description,
            'attribute_key' => $definition->attribute_key,
            'regex_pattern' => $definition->regex_pattern,
            'regex_cue' => $definition->regex_cue,
            'attribute_values' => $definition->attribute_values ?? [],
            'attribute_model' => $definition->attribute_model,
            'default_value' => $definition->default_value,
            'created_at' => RailsTimestamp::format($definition->created_at),
            'updated_at' => RailsTimestamp::format($definition->updated_at),
        ];
    }
}
